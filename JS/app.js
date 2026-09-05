import supabase from "../supabase.js";

let edited = false;
var selectedTextColor = "";
var cardBg = "";
var title = document.getElementById("title");
var description = document.getElementById("description");
let editIndex = null;
let userName = "";
let userid;
let Email;
let userRole;

// 1. Popup menu toggle
window.toggleProfileMenu = function () {
    const popup = document.getElementById("profilePopup");
    if (popup) {
        popup.classList.toggle("show");
    }
};

// Close dropdown on clicking outside
window.addEventListener("click", function (e) {
    const dropdown = document.querySelector(".profile-dropdown");
    const popup = document.getElementById("profilePopup");
    if (dropdown && popup && !dropdown.contains(e.target)) {
        popup.classList.remove("show");
    }
});

// Fetch initial like counts for all posts
async function fetchLikeCounts() {
    try {
        const { data, error } = await supabase.from("like_table").select("post_id");
        if (error) throw error;

        const counts = {};
        data.forEach(like => {
            counts[like.post_id] = (counts[like.post_id] || 0) + 1;
        });

        // Set all to 0 first, then populate actual counts
        document.querySelectorAll("[id^='like-']").forEach(el => el.innerText = "0");

        Object.keys(counts).forEach(postId => {
            const el = document.getElementById(`like-${postId}`);
            if (el) el.innerText = counts[postId];
        });
    } catch (err) {
        console.log("Error fetching initial likes:", err);
    }
}

// Search Posts
async function searchPosts() {
    let searchInput = document.getElementById("searchInput")?.value || "";
    console.log("Searching for:", searchInput);
    try {
        const { data, error } = await supabase
            .from("post_app_table")
            .select("*")
            .order('id', { ascending: false })
            .or(`title.ilike.%${searchInput}%,description.ilike.%${searchInput}%`);

        const postsContainer = document.getElementById("posts");
        if (!postsContainer) return;
        postsContainer.innerHTML = "";

        if (error) {
            console.log("Error searching posts:", error);
            return;
        }
        postsContainer.innerHTML = "";
        if (!data || data.length === 0) {
            postsContainer.innerHTML = `
        <div class="empty-state-card p-5 text-center my-3 shadow-sm">
            <i class="bi bi-search display-4 mb-3 d-block empty-icon"></i>
            <h5 class="fw-bold mb-2 empty-title">No Posts Found</h5>
            <p class="mb-0 empty-text">We couldn't find anything matching "<strong>${searchInput}</strong>". Try searching for something else!</p>
        </div>
         `;
            return;
        }
        data.forEach(post => { postsContainer.innerHTML += createPostCard(post); });

        await fetchLikeCounts();
    } catch (error) {
        console.log("Error searching posts:", error);
    }
}
function createPostCard(post) {
    let currentTextColor = post.text_color || "#ffffff";
    let displayUserName = post.user_name || "Anonymous";
    let displayEmail = post.email ? `~${post.email}` : "";

    let currentTheme = localStorage.getItem("theme") || "light";
    let emailColor = currentTheme === "dark" ? "#cbd5e1" : "#475569";

    const escapedDesc = (post.description || "")
        .replace(/`/g, '\\`')
        .replace(/\n/g, '\\n')
        .replace(/"/g, '&quot;');

    const escapedTitle = (post.title || "")
        .replace(/`/g, '\\`')
        .replace(/\n/g, '\\n')
        .replace(/"/g, '&quot;');

    return `
<div class="card mb-4 border-0 shadow-sm custom-post-card"
     style="border-radius:18px; overflow:hidden; transition:transform 0.2s ease, box-shadow 0.2s ease;">

    <!-- Header -->
    <div class="card-header d-flex justify-content-between align-items-center bg-transparent py-3 px-3"
         style="border-bottom:1px solid rgba(255,255,255,0.08);">

        <!-- User Info -->
        <div class="d-flex align-items-center gap-2">

            <div class="avatar-icon d-flex align-items-center justify-content-center rounded-circle fw-bold text-white"
                 style="width: 40px; height: 40px; background: linear-gradient(135deg, #a855f7, #7c3aed); font-size: 16px;">
                ${displayUserName.charAt(0).toUpperCase()}
            </div>

            <div>
                <strong
                    style="font-size:15px; display:block;"
                    class="mb-0 user-name-text"
                >
                    ${displayUserName}
                </strong>

                <small
                    class="d-block email-text-element"
                    style="
                        font-size:12px;
                        margin-top:1px;
                        color:${emailColor} !important;
                        font-weight:500;
                    "
                >
                    <i
                        class="bi bi-envelope-fill me-1"
                        style="color: #c084fc; font-size: 11px;"
                    ></i>
                    ${displayEmail}
                </small>
            </div>

        </div>


        <!-- Three Dots -->
        ${userid === post.user_id || userRole === "admin"
            ? `
            <div class="dropdown">

                <button
                    class="btn btn-sm btn-icon-action rounded-circle p-2"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    title="More options"
                >
                    <i
                        class="bi bi-three-dots-vertical"
                        style="font-size:19px;"
                    ></i>
                </button>


                <ul class="dropdown-menu dropdown-menu-end shadow">

                    <!-- Edit -->
                    <li>
                        <button
                            class="dropdown-item text-warning"
                            onclick="editPost(
                                event,
                                ${post.id},
                                \`${escapedDesc}\`,
                                \`${escapedTitle}\`,
                                '${post.bg_img}',
                                '${post.text_color}',
                                '${currentTextColor}',
                                '${post.user_id}'
                            )"
                        >
                            <i class="bi bi-pencil-square me-2"></i>
                            Edit
                        </button>
                    </li>


                    <!-- Delete -->
                    <li>
                        <button
                            class="dropdown-item text-danger"
                            onclick="delpost(
                                event,
                                ${post.id},
                                '${post.user_id}'
                            )"
                        >
                            <i class="bi bi-trash me-2"></i>
                            Delete
                        </button>
                    </li>

                </ul>

            </div>
            `
            : ""
        }

    </div>


    <!-- Post Content -->
    <div
        class="card-body p-4 position-relative"
        style="
            background-image:
            linear-gradient(
                to bottom,
                rgba(0,0,0,0.15),
                rgba(0,0,0,0.45)
            ),
            url('${post.bg_img}');

            background-size:cover;
            background-position:center;
            min-height:150px;
            border-radius:12px;
            margin:12px;
        "
    >

        <h4
            style="
                color:${currentTextColor};
                font-weight:700;
                letter-spacing:-0.2px;
            "
            class="mb-2"
        >
            ${post.title}
        </h4>

        <p
            style="
                color:${currentTextColor};
                font-size:0.95rem;
                line-height:1.5;
                opacity:0.95;
            "
            class="mb-0"
        >
            ${post.description}
        </p>

    </div>


    <!-- Action Bar -->
    <div class="card-footer bg-transparent border-0 pt-0 pb-3 px-3">

        <div
            class="d-flex justify-content-around w-100 py-2 border-top border-bottom"
            style="border-color:rgba(255,255,255,0.06) !important;"
        >

            <!-- Like -->
            <button
                class="btn btn-sm action-btn d-flex align-items-center gap-2 fw-semibold"
                onclick="toggleLike(${post.id})"
            >
                <i
                    class="bi bi-hand-thumbs-up"
                    style="font-size:16px;"
                ></i>

                <span>
                    <span id="like-${post.id}">0</span>
                    Like
                </span>
            </button>


            <!-- Comment -->
            <button
                class="btn btn-sm action-btn d-flex align-items-center gap-2 fw-semibold"
                onclick="toggleCommentSection(${post.id})"
            >
                <i
                    class="bi bi-chat-left-text"
                    style="font-size:16px;"
                ></i>

                <span>Comment</span>
            </button>

        </div>


        <!-- Comment Box -->
        <div
            id="comment-box-${post.id}"
            class="d-none w-100 mt-3"
        >

            <div
                id="comments-list-${post.id}"
                class="mb-3 overflow-y-auto px-1"
                style="max-height:160px;"
            ></div>


            <div
                class="input-group rounded-3 overflow-hidden p-1"
                style="
                    background:rgba(255,255,255,0.05);
                    border:1px solid rgba(255,255,255,0.1);
                "
            >

                <input
                    type="text"
                    id="comment-input-${post.id}"
                    class="form-control comment-input-field border-0 bg-transparent text-white shadow-none"
                    placeholder="Write a comment..."
                    style="
                        font-size:14px;
                        padding:10px 14px;
                    "
                >

                <button
                    class="btn px-4 fw-bold text-white send-btn-purple rounded-2"
                    style="
                       
                        border:none;
                    "
                    onclick="addComment(${post.id})"
                >
                    Send
                </button>

            </div>

        </div>

    </div>

</div>
`;
}


// Onload setup
window.onload = async function () {
    const postsContainer = document.getElementById("posts");
    const imgInput = document.getElementById("imgInput");
    if (imgInput) {
        imgInput.addEventListener("change", previewFile);
    }

    // Auth System
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user) {

            userid = user.id;
            Email = user.email;

            userName =
                `${user.user_metadata?.first_name || ""} ${user.user_metadata?.last_name || ""}`
                    .trim();

            if (!userName) {
                userName = user.email.split("@")[0];
            }

            userRole = user.user_metadata?.role || "";

            const firstLetter =
                userName.charAt(0).toUpperCase();

            if (document.getElementById("userInitial")) {
                document.getElementById("userInitial").innerText =
                    firstLetter;
            }

            if (document.getElementById("dropdownEmail")) {
                document.getElementById("dropdownEmail").innerText =
                    Email;
            }

            // 🔔 Notification system
            await loadNotifications();
            await updateBadgeCount();
            listenForNotifications(userid);

        }

        if (userRole === "admin") {
            const adminBtn = document.getElementById("admin-panel-btn");
            if (adminBtn) {
                adminBtn.classList.remove("d-none");
            }
        } else {
            console.log("No active session found.");
        }

        if (error) console.log("Auth Error:", error);
    } catch (error) {
        console.log("User load error:", error);
    }

    // Fetch initial posts list
    try {
        const { data, error } = await supabase
            .from('post_app_table')
            .select("*")
            .order('id', { ascending: false });

        if (error) {
            console.log("Supabase Fetch Error:", error);
            return;
        }

        if (postsContainer) {
            if (!data || data.length === 0) {
                postsContainer.innerHTML = "<p class='text-center no-comment-text'>No posts available yet.</p>";
            } else {
                postsContainer.innerHTML = "";
                data.forEach(post => {
                    postsContainer.innerHTML += createPostCard(post);
                });
            }
        }

        await fetchLikeCounts();

        // Initialize Real-time Subscriptions ONCE
        realTimePost();
        realTimeLikes();
        realTimeComments();
    } catch (err) {
        console.log("Catch Block Error:", err);
    }
};

async function toggleCommentSection(postId) {
    const commentBox = document.getElementById(`comment-box-${postId}`);
    if (!commentBox) return;

    commentBox.classList.toggle("d-none");

    if (!commentBox.classList.contains("d-none")) {
        await fetchComments(postId);
    }
}

// async function addComment(postId) {
//     if (!userid) {
//         Swal.fire("Error", "Please login first to comment.", "error");
//         return;
//     }

//     const input = document.getElementById(`comment-input-${postId}`);
//     if (!input) return;
//     const text = input.value.trim();

//     if (!text) return;

//     try {
//         const { error } = await supabase
//             .from("comment_table")
//             .insert({
//                 post_id: postId,
//                 user_id: userid,
//                 user_name: userName,
//                 comment_text: text
//             });

//         if (error) throw error;
//        input.value = "";

//         // 4. Notification send
//         await sendNotification(
//             post.user_id,
//             userName,
//             "comment",
//             postId
//         );


//     } catch (err) {
//         console.log("Error inserting comment:", err);
//         Swal.fire("Error", "Could not submit your comment.", "error");
//     }
// }
async function addComment(postId) {
    if (!userid) {
        Swal.fire("Error", "Please login first to comment.", "error");
        return;
    }

    const input = document.getElementById(`comment-input-${postId}`);
    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    try {
        // First get the post owner
        const { data: post, error: postError } = await supabase
            .from("post_app_table")
            .select("user_id")
            .eq("id", postId)
            .single();

        if (postError) throw postError;

        // Insert comment
        const { error: commentError } = await supabase
            .from("comment_table")
            .insert({
                post_id: postId,
                user_id: userid,
                user_name: userName,
                comment_text: text
            });

        if (commentError) throw commentError;

        input.value = "";

        // Send notification to post owner
        await sendNotification(
            post.user_id,
            userName,
            "comment",
            postId
        );

    } catch (err) {
        console.log("Error inserting comment:", err);

        Swal.fire(
            "Error",
            "Could not submit your comment.",
            "error"
        );
    }
}


// async function fetchComments(postId) {
//     const container = document.getElementById(`comments-list-${postId}`);
//     if (!container) return;

//     try {
//         const { data, error } = await supabase
//             .from("comment_table")
//             .select("*")
//             .eq("post_id", postId)
//             .order("id", { ascending: true });

//         if (error) throw error;

//         container.innerHTML = "";

//         if (data.length === 0) {
//             container.innerHTML = `<p class="no-comment-text small ps-2 mb-1" style="font-size:12px;">No comments yet. Be the first to comment!</p>`;
//             return;
//         }

//         data.forEach(c => {
//             const isOwnerOrAdmin = (userid === c.user_id || userRole === 'admin');
//             const escapedCommentText = c.comment_text.replace(/`/g, '\\`').replace(/"/g, '&quot;');

//             container.innerHTML += `
// <div class="p-2 mb-2 rounded comment-box-item d-flex justify-content-between align-items-start"
//      id="comment-item-${c.id}"
//      style="font-size:13px; border-left:3px solid #14b8a6; position: relative;">

//     <div class="flex-grow-1 me-2 text-start">
//         <strong style="color:#14b8a6; display:block; font-size:12px;">${c.user_name}</strong>
//         <span class="comment-text-content" id="comment-text-${c.id}">${c.comment_text}</span>
//     </div>

//     ${isOwnerOrAdmin ? `
//     <div class="dropdown">
//         <button class="btn btn-sm comment-dots-btn p-0 border-0 shadow-none" type="button" data-bs-toggle="dropdown" aria-expanded="false">
//             <i class="bi bi-three-dots" style="font-size: 16px;"></i>
//         </button>
//         <ul class="dropdown-menu dropdown-menu-end custom-comment-dropdown shadow">
//             ${userid === c.user_id ? `
//             <li>
//                 <button class="dropdown-item text-warning d-flex align-items-center gap-2" onclick="editComment(${c.id}, \`${escapedCommentText}\`, ${c.post_id})">
//                     <i class="bi bi-pencil-square"></i> Edit
//                 </button>
//             </li>
//             ` : ''}
//             <li>
//                 <button class="dropdown-item text-danger d-flex align-items-center gap-2" onclick="deleteComment(${c.id}, '${c.user_id}', ${c.post_id})">
//                     <i class="bi bi-trash"></i> Delete
//                 </button>
//             </li>
//         </ul>
//     </div>
//     ` : ''}
// </div>`;
//         });
//         container.scrollTop = container.scrollHeight;

//     } catch (err) {
//         console.log("Error fetching comments:", err);
//     }
// }
async function fetchComments(postId) {
    const container = document.getElementById(`comments-list-${postId}`);
    if (!container) return;

    try {
        const { data, error } = await supabase
            .from("comment_table")
            .select("*")
            .eq("post_id", postId)
            .order("id", { ascending: true });

        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = `<p class="no-comment-text small ps-2 mb-1" style="font-size:12px;">No comments yet. Be the first to comment!</p>`;
            return;
        }

        let commentsHTML = "";

        data.forEach(c => {
            const isOwnerOrAdmin = (userid === c.user_id || userRole === 'admin');
            const escapedCommentText = c.comment_text
                .replace(/\\/g, '\\\\')
                .replace(/`/g, '\\`')
                .replace(/"/g, '&quot;')
                .replace(/'/g, "&#39;");

            commentsHTML += `
<div class="p-2 mb-2 rounded comment-box-item d-flex justify-content-between align-items-start"
     id="comment-item-${c.id}"
     style="font-size:13px; border-left:3px solid #a855f7;">
    
    <div class="flex-grow-1 me-2 text-start">
        <strong style="color: var(--primary-light, #c084fc); display:block; font-size:12px;">${c.user_name}</strong>
        <span class="comment-text-content" id="comment-text-${c.id}">${c.comment_text}</span>
    </div>

    ${isOwnerOrAdmin ? `
    <div class="dropdown">
        <button class="btn btn-sm comment-dots-btn p-0 border-0 shadow-none" 
        type="button" 
        data-bs-toggle="dropdown" 
        data-bs-popper-config='{"strategy":"fixed"}'
        aria-expanded="false">
    <i class="bi bi-three-dots" style="font-size: 16px;"></i>
</button>
        <ul class="dropdown-menu dropdown-menu-end custom-comment-dropdown shadow">
            ${userid === c.user_id ? `
            <li>
                <button class="dropdown-item text-warning d-flex align-items-center gap-2" onclick="editComment(${c.id}, \`${escapedCommentText}\`, ${c.post_id})">
                    <i class="bi bi-pencil-square"></i> Edit
                </button>
            </li>
            ` : ''}
            <li>
                <button class="dropdown-item text-danger d-flex align-items-center gap-2" onclick="deleteComment(${c.id}, '${c.user_id}', ${c.post_id})">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </li>
        </ul>
    </div>
    ` : ''}
</div>`;
        });

        // Batch DOM update
        container.innerHTML = commentsHTML;
        container.scrollTop = container.scrollHeight;

    } catch (err) {
        console.error("Error fetching comments:", err);
    }
}
async function editComment(commentId, oldText, postId) {
    if (!userid) {
        Swal.fire("Error", "Please login first", "error");
        return;
    }

    const { value: newCommentText } = await Swal.fire({
        title: 'Edit Comment',
        input: 'text',
        inputValue: oldText,
        showCancelButton: true,
        confirmButtonText: 'Update',
        confirmButtonColor: '#14b8a6',
        inputValidator: (value) => {
            if (!value.trim()) {
                return 'Comment cannot be empty!';
            }
        }
    });

    if (newCommentText && newCommentText.trim() !== oldText) {
        try {
            const { error } = await supabase
                .from("comment_table")
                .update({ comment_text: newCommentText.trim() })
                .eq("id", commentId);

            if (error) throw error;

            const commentTextElem = document.getElementById(`comment-text-${commentId}`);
            if (commentTextElem) {
                commentTextElem.innerText = newCommentText.trim();
            }

            Swal.fire({
                icon: "success",
                title: "Comment Updated!",
                timer: 1000,
                showConfirmButton: false
            });

        } catch (err) {
            console.log("Error updating comment:", err);
            Swal.fire("Error", "Could not update comment.", "error");
        }
    }
}
// Window bindings me add karein
window.editComment = editComment;
async function deleteComment(commentId, commentUserId, postId) {
    if (!userid) {
        Swal.fire("Error", "Please login first", "error");
        return;
    }
    if (userid !== commentUserId && userRole !== 'admin') {
        Swal.fire("Access Denied", "You can delete only your own comment", "error");
        return;
    }

    let result = await Swal.fire({
        title: "Delete Comment?",
        text: "This comment will be permanently deleted",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete"
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase
        .from("comment_table")
        .delete()
        .eq("id", commentId);

    if (error) {
        console.log(error);
        Swal.fire("Error", error.message, "error");
        return;
    }

    Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1000,
        showConfirmButton: false
    });
}

// async function toggleLike(postId) {
//     if (!userid) {
//         Swal.fire("Error", "Please login first to like posts.", "error");
//         return;
//     }

//     try {
//         const { data: likeData, error: likeError } = await supabase
//             .from('like_table')
//             .select("*")
//             .eq('post_id', postId)
//             .eq('user_id', userid);

//         if (likeError) throw likeError;

//         if (likeData && likeData.length > 0) {
//             const { error: deleteError } = await supabase
//                 .from('like_table')
//                 .delete()
//                 .eq('post_id', postId)
//                 .eq('user_id', userid);
//             if (deleteError) throw deleteError;
//         } else {
//             const { error: insertError } = await supabase
//                 .from("like_table")
//                 .insert({ post_id: postId, user_id: userid });
//             if (insertError) throw insertError;
//             await sendNotification(
//                 post.user_id,
//                 userName,
//                 "like",
//                 postId
//             );
//         }
//     } catch (err) {
//         console.log("Error in toggleLike handling:", err);
//     }
// }
async function toggleLike(postId) {
    if (!userid) {
        Swal.fire("Error", "Please login first to like posts.", "error");
        return;
    }

    try {
        // Get post owner
        const { data: post, error: postError } = await supabase
            .from("post_app_table")
            .select("user_id")
            .eq("id", postId)
            .single();

        if (postError) throw postError;

        // Check existing like
        const { data: likeData, error: likeError } = await supabase
            .from("like_table")
            .select("*")
            .eq("post_id", postId)
            .eq("user_id", userid);

        if (likeError) throw likeError;

        if (likeData && likeData.length > 0) {

            // Unlike
            const { error: deleteError } = await supabase
                .from("like_table")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", userid);

            if (deleteError) throw deleteError;

        } else {

            // Like
            const { error: insertError } = await supabase
                .from("like_table")
                .insert({
                    post_id: postId,
                    user_id: userid
                });

            if (insertError) throw insertError;

            // Send notification
            await sendNotification(
                post.user_id,
                userName,
                "like",
                postId
            );
        }

    } catch (err) {
        console.log("Error in toggleLike handling:", err);
    }
}


async function post() {
    var title = document.getElementById("title");
    var description = document.getElementById("description");
    let imageInput = document.getElementById("imgInput");
    let previewImg = document.getElementById("previewImg");

    if (title.value.trim() && description.value.trim()) {
        let colorToSave = selectedTextColor || "#ffffff";
        let imageFile = imageInput ? imageInput.files[0] : null;
        let finalBgUrl = "";

        if (imageFile) {
            let fileExtension = imageFile.name.split('.').pop();
            let fileName = `${Date.now()}_${fileExtension}`;

            const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, imageFile);

            if (uploadError) {
                Swal.fire("Image Upload Failed!", "There was an error uploading the image.", "error");
                return;
            }

            const { data: imageData } = supabase.storage.from('post-images').getPublicUrl(fileName);
            finalBgUrl = imageData.publicUrl;

        } else if (cardBg) {
            finalBgUrl = cardBg;
        } else {
            Swal.fire("No Image Selected!", "Please select or upload an image for the post.", "error");
            return;
        }

        if (edited) {
            try {
                const { error } = await supabase
                    .from('post_app_table')
                    .update({
                        title: title.value,
                        description: description.value,
                        bg_img: finalBgUrl,
                        text_color: colorToSave
                    })
                    .eq('id', editIndex);

                if (error) console.log(error);

                Swal.fire({
                    icon: "success",
                    title: "Updated!",
                    text: "Your post has been updated successfully.",
                });
                edited = false;
                editIndex = null;
                const postBtn = document.getElementById("postBtn");
                if (postBtn) postBtn.innerHTML = "Post";

            } catch (error) {
                console.log(error);
            }
        } else {
            try {
                const { error } = await supabase
                    .from('post_app_table')
                    .insert({
                        title: title.value,
                        description: description.value,
                        bg_img: finalBgUrl,
                        text_color: colorToSave,
                        email: Email,
                        user_id: userid,
                        user_name: userName,
                        role: userRole
                    });

                if (error) {
                    console.log("Database Insert Error:", error);
                }
            } catch (error) {
                console.log(error);
            }
        }

        title.value = "";
        description.value = "";
        cardBg = "";
        if (imageInput) imageInput.value = "";
        if (previewImg) {
            previewImg.classList.add("d-none");
            previewImg.src = "";
        }
    } else {
        Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Title & description can't be empty!",
        });
    }
}

// Global Real-time Subscription (Subscribed once)
function realTimePost() {
    supabase
        .channel('realtime-post')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: "post_app_table" },
            async payload => {
                console.log('Post table change received!', payload);
                try {
                    const { data, error } = await supabase
                        .from("post_app_table")
                        .select("*")
                        .order("id", { ascending: false });

                    if (error) throw error;

                    const postsContainer = document.getElementById("posts");
                    if (!postsContainer) return;

                    postsContainer.innerHTML = "";

                    if (!data || data.length === 0) {
                        postsContainer.innerHTML = "<p class='text-center no-comment-text'>No posts available yet.</p>";
                        return;
                    }

                    data.forEach(post => {
                        postsContainer.innerHTML += createPostCard(post);
                    });

                    await fetchLikeCounts();
                } catch (error) {
                    console.log(error);
                }
            }
        )
        .subscribe((status) => {
            console.log(status);
        });
}

function realTimeLikes() {
    supabase
        .channel('realtime-likes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'like_table' },
            async (payload) => {
                console.log("Like change received:", payload);
                const postId = payload.new?.post_id || payload.old?.post_id;
                if (!postId) return;

                const { count } = await supabase
                    .from("like_table")
                    .select("*", { count: "exact", head: true })
                    .eq("post_id", postId);

                const likeElement = document.getElementById(`like-${postId}`);
                if (likeElement) {
                    likeElement.innerText = count || 0;
                }
            }
        )
        .subscribe((status) => {
            console.log(status);
        });
}

function realTimeComments() {
    supabase
        .channel('realtime-comments')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'comment_table' },
            async (payload) => {
                console.log("Comment change received:", payload);
                const postId = payload.new?.post_id || payload.old?.post_id;
                if (postId) {
                    const commentBox = document.getElementById(`comment-box-${postId}`);
                    if (commentBox && !commentBox.classList.contains("d-none")) {
                        await fetchComments(postId);
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log(status);
        });
}

async function editPost(event, id, desc, titleVal, bg_img, textColor, currentTextColor, userId) {
    if (!userid) {
        Swal.fire({ icon: "error", title: "Login Required", text: "Please login first." });
        return;
    }

    if (userid !== userId && userRole !== 'admin') {
        Swal.fire({ icon: "error", title: "Access Denied", text: "You can only edit your own post." });
        return;
    }

    const titleInput = document.getElementById("title");
    const descInput = document.getElementById("description");
    if (titleInput) titleInput.value = titleVal;
    if (descInput) descInput.value = desc;

    cardBg = bg_img;
    selectedTextColor = textColor || "#ffffff";
    edited = true;
    editIndex = id;
    let postBtn = document.getElementById("postBtn");
    if (postBtn) postBtn.innerHTML = "Update Post";
}

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        Swal.fire('Error', error.message, 'error');
        return;
    }
    Swal.fire({
        icon: 'success',
        title: 'Logged Out',
        timer: 1200,
        showConfirmButton: false
    }).then(() => {
        window.location.href = 'index.html';
    });
}

function previewFile(e) {
    const previewImg = document.getElementById("previewImg");
    const file = e.target.files[0];

    if (!file || !previewImg) return;

    previewImg.src = URL.createObjectURL(file);
    previewImg.classList.remove("d-none");
    previewImg.style.display = "block";

    cardBg = "";
    document.querySelectorAll(".bgImg").forEach(img => {
        img.classList.remove("addImg");
    });
}

function addImg(src) {
    cardBg = src;
    let imageInput = document.getElementById("imgInput");
    let previewImg = document.getElementById("previewImg");
    if (imageInput) imageInput.value = "";
    if (previewImg) {
        previewImg.classList.add("d-none");
        previewImg.src = "";
    }

    const images = document.querySelectorAll(".bgImg");
    images.forEach((img) => {
        img.classList.remove("addImg");
        if (img.getAttribute("src") === src) {
            img.classList.add("addImg");
        }
    });
}

async function delpost(event, id, UserId) {
    if (!userid) {
        Swal.fire("Error", "Please login first", "error");
        return;
    }
    if (userid !== UserId && userRole !== 'admin') {
        Swal.fire({ icon: "error", title: "Access Denied", text: "You can only delete your own post." });
        return;
    }

    let result = await Swal.fire({
        title: "Are you sure?",
        text: "This post will be deleted permanently!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!"
    });

    if (!result.isConfirmed) return;

    const { error: deleteError } = await supabase
        .from("post_app_table")
        .delete()
        .eq("id", id);

    if (deleteError) {
        Swal.fire("Error", deleteError.message, "error");
        return;
    }

    Swal.fire("Deleted!", "Post deleted successfully.", "success");
    const card = event.target.closest(".card");
    if (card) card.remove();
}

function applycolor(element) {
    var colorbox = document.getElementsByClassName('colorbox');
    for (var i = 0; i < colorbox.length; i++) {
        colorbox[i].classList.remove('selected');
    }
    element.classList.add('selected');
    selectedTextColor = element.style.backgroundColor;
}
// =====================================================
// NOTIFICATION SYSTEM
// =====================================================

let notifications = [];
let notificationChannel = null;


// -----------------------------------------------------
// Create notification UI
// -----------------------------------------------------
function addNotification(
    message,
    type = "info",
    notificationId = null,
    createdAt = null
) {
    const list = document.getElementById("notificationList");
    if (!list) {
        console.error("notificationList not found");
        return;
    }

    // Remove empty state
    const noNotifText = document.getElementById("noNotifText");
    if (noNotifText) {
        noNotifText.remove();
    }

    const notifId = notificationId || `live-${Date.now()}-${Math.random()}`;

    // Prevent duplicate notification
    if (document.getElementById(`notif-${notifId}`)) {
        return;
    }

    const time = createdAt
        ? new Date(createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })
        : new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

    let icon = "bi-bell-fill";

    if (type === "like") {
        icon = "bi-hand-thumbs-up-fill";
    }

    if (type === "comment") {
        icon = "bi-chat-left-text-fill";
    }

    const item = document.createElement("div");

    item.id = `notif-${notifId}`;

    item.className = "notification-item p-3 mb-2 rounded";

    item.style.cssText = `
        display: block;
        background: rgba(168,85,247,0.12);
        border-left: 3px solid #a855f7;
        color: white;
    `;

    item.innerHTML = `
        <div class="d-flex align-items-start gap-2">

            <div style="
                width:34px;
                height:34px;
                min-width:34px;
                border-radius:50%;
                background:linear-gradient(135deg,#a855f7,#7c3aed);
                display:flex;
                align-items:center;
                justify-content:center;
                color:white;
            ">
                <i class="bi ${icon}"></i>
            </div>

            <div style="flex:1;">

                <div class="fw-bold notification-message">
                    ${message}
                </div>

                <small class="text-muted">
                    ${time}
                </small>

            </div>

        </div>
    `;

    list.prepend(item);

    console.log("Notification added:", message);
}


// -----------------------------------------------------
// Send notification
// -----------------------------------------------------
async function sendNotification(
    postOwnerId,
    senderName,
    type,
    postId
) {
    // Don't notify yourself
    if (!userid || !postOwnerId || postOwnerId === userid) {
        return;
    }

    try {

        const { error } = await supabase
            .from("NOTIFICATION")
            .insert({
                user_id: postOwnerId,
                sender_name: senderName,
                type: type,
                post_id: postId,
                is_read: false
            });

        if (error) {
            console.error(
                "Notification insert error:",
                error
            );
            return;
        }

        console.log("Notification inserted successfully");

    } catch (error) {

        console.error(
            "sendNotification error:",
            error
        );
    }
}


// -----------------------------------------------------
// Notification message
// -----------------------------------------------------
function getNotificationMessage(notification) {

    if (notification.type === "like") {

        return `${notification.sender_name} liked your post.`;

    }

    if (notification.type === "comment") {

        return `${notification.sender_name} commented on your post.`;

    }

    return `${notification.sender_name} interacted with your post.`;
}


// -----------------------------------------------------
// Load notifications from database
// -----------------------------------------------------
async function loadNotifications() {

    if (!userid) {
        console.log("No logged-in user");
        return;
    }

    const list =
        document.getElementById("notificationList");

    if (!list) {
        console.error(
            "notificationList element not found"
        );
        return;
    }

    try {

        console.log(
            "Loading notifications for:",
            userid
        );

        const { data, error } = await supabase
            .from("NOTIFICATION")
            .select("*")
            .eq("user_id", userid)
            .eq("is_read", false)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        console.log(
            "Notifications received:",
            data
        );

        list.innerHTML = "";
        notifications = [];

        if (!data || data.length === 0) {

            list.innerHTML = `
                <p
                    id="noNotifText"
                    class="text-center text-muted small my-3"
                >
                    No new notifications
                </p>
            `;

            await updateBadgeCount();

            return;
        }

        data.forEach(notification => {

            const message =
                getNotificationMessage(notification);

            notifications.push(notification);

            addNotification(
                message,
                notification.type,
                notification.id,
                notification.created_at
            );

        });

        await updateBadgeCount();

    } catch (error) {

        console.error(
            "Load notifications error:",
            error
        );
    }
}


// -----------------------------------------------------
// Realtime notifications
// -----------------------------------------------------
function listenForNotifications(currentUserId) {

    if (!currentUserId) {
        console.error(
            "Cannot start notification realtime: no user ID"
        );
        return;
    }

    // Prevent duplicate channel
    if (notificationChannel) {

        console.log(
            "Notification channel already exists"
        );

        return;
    }

    console.log(
        "Starting notification realtime..."
    );

    notificationChannel = supabase
        .channel(
            `notification-channel-${currentUserId}`
        )
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "NOTIFICATION",
                filter:
                    `user_id=eq.${currentUserId}`
            },
            async payload => {

                console.log(
                    "NEW NOTIFICATION:",
                    payload
                );

                const notification =
                    payload.new;

                const message =
                    getNotificationMessage(
                        notification
                    );

                notifications.unshift(
                    notification
                );

                addNotification(
                    message,
                    notification.type,
                    notification.id,
                    notification.created_at
                );

                await updateBadgeCount();
            }
        )
        .subscribe(status => {

            console.log(
                "Notification realtime status:",
                status
            );

            if (status === "SUBSCRIBED") {

                console.log(
                    "NOTIFICATION REALTIME CONNECTED"
                );

            }

            if (status === "CHANNEL_ERROR") {

                console.error(
                    "Notification realtime channel error"
                );

            }

            if (status === "TIMED_OUT") {

                console.error(
                    "Notification realtime timed out"
                );

            }
        });
}


// -----------------------------------------------------
// Update unread badge
// -----------------------------------------------------
async function updateBadgeCount() {

    if (!userid) {
        return;
    }

    try {

        const { count, error } = await supabase
            .from("NOTIFICATION")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("user_id", userid)
            .eq("is_read", false);

        if (error) {
            throw error;
        }

        const total = count || 0;

        // Your actual badge ID
        const badge =
            document.getElementById(
                "notificationBadge"
            );

        const unreadCount =
            document.getElementById(
                "unreadCount"
            );

        if (badge) {

            if (total > 0) {

                badge.innerText = total;
                badge.classList.remove(
                    "d-none"
                );

                // In case CSS uses display:none
                badge.style.display =
                    "inline-block";

            } else {

                badge.innerText = "0";

                badge.classList.add(
                    "d-none"
                );

                badge.style.display =
                    "none";
            }
        }

        if (unreadCount) {

            unreadCount.innerText =
                total;

        }

        console.log(
            "Unread notifications:",
            total
        );

    } catch (error) {

        console.error(
            "Badge count error:",
            error
        );
    }
}


// -----------------------------------------------------
// Mark notifications as read
// -----------------------------------------------------
async function markNotificationsAsRead() {

    if (!userid) {
        return;
    }

    try {

        const { error } = await supabase
            .from("NOTIFICATION")
            .update({
                is_read: true
            })
            .eq("user_id", userid)
            .eq("is_read", false);

        if (error) {
            throw error;
        }

        console.log(
            "Notifications marked as read"
        );

        // Clear local notification list
        notifications = [];

        // Hide badge
        const badge =
            document.getElementById(
                "notificationBadge"
            );

        const unreadCount =
            document.getElementById(
                "unreadCount"
            );

        if (badge) {

            badge.innerText = "0";

            badge.classList.add(
                "d-none"
            );

            badge.style.display =
                "none";
        }

        if (unreadCount) {
            unreadCount.innerText = "0";
        }

    } catch (error) {

        console.error(
            "Error marking notifications as read:",
            error
        );
    }
}


// -----------------------------------------------------
// Toggle notification popup
// -----------------------------------------------------
window.toggleNotifications = async function () {

    const popup =
        document.getElementById(
            "notificationPopup"
        );

    if (!popup) {
        console.error(
            "notificationPopup not found"
        );
        return;
    }

    const isHidden =
        popup.style.display === "none" ||
        popup.style.display === "";

    if (isHidden) {

        popup.style.display = "block";

        // Mark as read when opened
        await markNotificationsAsRead();

    } else {

        popup.style.display = "none";

    }
};


// -----------------------------------------------------
// Compatibility function
// -----------------------------------------------------
async function fetchUnreadNotificationCount() {
    await updateBadgeCount();
}




function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    // Sync Checkbox Pill Switch State
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.checked = (theme === "dark");
    }

    // Sync Old Theme Icon (if used somewhere)
    const icon = document.getElementById("themeIcon");
    if (icon) {
        icon.className = theme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-fill";
        icon.style.setProperty('color', '#ffffff', 'important');
    }

    const emailElements = document.querySelectorAll('.email-text-element');
    emailElements.forEach(el => {
        el.style.setProperty('color', (theme === "dark" ? "#cbd5e1" : "#475569"), 'important');
    });
}

// Toggle Function
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.classList.toggle("dark-mode", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
}

// Checkbox Event Handling safely
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('change', (e) => {
        applyTheme(e.target.checked ? 'dark' : 'light');
    });
}

// Initialization
(function initTheme() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
})();
// Page load hone par animations chalane ke liye
// 1. ScrollTrigger Plugin Register Karein


// --- Global bindings for Modular compatibility ---
window.logout = logout;
window.post = post;
window.addImg = addImg;
window.previewFile = previewFile;
window.applycolor = applycolor;
window.editPost = editPost;
window.delpost = delpost;
window.searchPosts = searchPosts;
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.toggleProfileMenu = toggleProfileMenu;
window.toggleLike = toggleLike;
window.fetchLikeCounts = fetchLikeCounts;
window.toggleCommentSection = toggleCommentSection;
window.addComment = addComment;
window.fetchComments = fetchComments;
window.createPostCard = createPostCard;
window.realTimePost = realTimePost;
window.realTimeLikes = realTimeLikes;
window.deleteComment = deleteComment;
window.updateBadgeCount = updateBadgeCount;
window.loadNotifications = loadNotifications;
window.listenForNotifications = listenForNotifications;
window.sendNotification = sendNotification;



// 1. Plugins Register Karein
/* ===================================================
   POSTIFY APP - GSAP STRING EFFECT & POINTER
   =================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // 1. FOOLPROOF POINTER MOVEMENT
    let pointer = document.getElementById("pointer");

    // Agar HTML mein pointer missing ho toh khud create kar dega
    if (!pointer) {
        pointer = document.createElement("div");
        pointer.id = "pointer";
        document.body.appendChild(pointer);
    }

    // Pointer ko Exact Center align karna
    gsap.set(pointer, { xPercent: -50, yPercent: -50 });

    // Direct Mouse Move Listener
    window.addEventListener("mousemove", (e) => {
        gsap.to(pointer, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.12,
            ease: "power2.out",
            boxShadow: "0 0 25px rgba(16, 185, 129, 1)"
        });
    });
    // 3. SAFE ENTRANCE TIMELINE (Fixes Hidden Navbar & Form)
    if (typeof gsap !== "undefined") {
        const tl = gsap.timeline({
            defaults: {
                ease: "power3.out",
                duration: 0.8,
                clearProps: "all" // Animation poori hotey hi saari hidden inline styles remove kar dega
            }
        });

        // Step 1: Navbar (Multiple fallbacks for exact tag/class)
        tl.from("nav, .navbar, .custom-navbar", {
            y: -50,
            opacity: 0
        })
            // Step 2: Left Side Form Container
            .from(".col-lg-4, .col-md-6:first-child, .create-post-card, .form-container", {
                x: -50,
                opacity: 0
            }, "-=0.4")
            // Step 3: Search Box
            .from(".search-box", {
                y: -20,
                opacity: 0
            }, "-=0.3")
            // Step 4: Feed Cards
            .from(".card", {
                y: 30,
                opacity: 0,
                stagger: 0.12
            }, "-=0.3");
    }

});