import supabase, { supabaseAdmin } from '../supabase.js';

window.addEventListener("DOMContentLoaded", async () => {
    console.log("Admin page successfully loaded, initializing data...");
    await checkAdmin();
});

async function checkAdmin() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = "index.html";
        return;
    }
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
        Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'You are not authorized to view this page!',
            confirmButtonColor: '#d33'
        }).then(() => {
            window.location.href = "index.html";
        });
        return;
    }

    console.log("Welcome admin!", user.email);
    await loadStats();
    await loadAllPost();
    await loadAllComments();
    await loadAllUsers();
    setupAdminNotifications();
}

async function loadAllUsers() {
    try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) throw error;

        const users = data.users;
        const tableBody = document.getElementById("users-table-body");
        if (!tableBody) return;

        if (!users || users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No users registered yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        users.forEach((user, index) => {
            const joinedDate = new Date(user.created_at).toLocaleDateString();
            const fullName = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User';
            const role = user.user_metadata?.role || 'user';

            tableBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${fullName}</strong></td>
                    <td>${user.email}</td>
                    <td><span class="badge ${role === 'admin' ? 'bg-danger' : 'bg-success'}">${role}</span></td>
                    <td>${joinedDate}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        const totalUsersEl = document.getElementById("total-users");
        if (totalUsersEl) {
            totalUsersEl.innerText = users.length;
        }

    } catch (err) {
        console.error("Error loading users with supabaseAdmin:", err.message);
    }
}

async function deleteUser(userId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "Kya aap waqai is user ko delete karna chahte hain? Iske saare posts bhi delete ho jayenge!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Yes, delete user!',
        cancelButtonText: 'Cancel',
        background: '#1e293b',
        color: '#fff'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'Deleting user...',
        html: 'Please wait while we remove the user data.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: '#1e293b',
        color: '#fff'
    });

    try {
        const { error: postsError } = await supabase
            .from("post_app_table")
            .delete()
            .eq("user_id", userId);

        if (postsError) {
            console.error("Error deleting user posts:", postsError);
        }

        const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            console.error("Auth error:", error);
            let errorMessage = error.message;
            if (error.message.includes("service_role")) {
                errorMessage = "Admin permissions error. Please check your service role key.";
            }

            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: errorMessage,
                background: '#1e293b',
                color: '#fff'
            });
            return;
        }

        await Swal.fire({
            icon: 'success',
            title: 'Deleted Successfully!',
            text: 'User aur unka saara data system se remove kar diya gaya hai.',
            timer: 2000,
            showConfirmButton: false,
            background: '#1e293b',
            color: '#fff'
        });

        await loadAllUsers();
        await loadStats();

    } catch (error) {
        console.error("Unexpected error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Unexpected Error',
            text: 'An unexpected error occurred while deleting the user.',
            background: '#1e293b',
            color: '#fff'
        });
    }
}

async function loadStats() {
    try {
        const { count: postsCount, error: postErr } = await supabase
            .from('post_app_table')
            .select('*', { count: 'exact', head: true });

        const { count: commentsCount, error: commentErr } = await supabase
            .from('comment_table')
            .select('*', { count: 'exact', head: true });

        const { count: likesCount, error: likeErr } = await supabase
            .from('like_table')
            .select('*', { count: 'exact', head: true });

        if (postErr) console.error("Post stats error:", postErr);
        if (commentErr) console.error("Comment stats error:", commentErr);
        if (likeErr) console.error("Like stats error:", likeErr);

        const totalPostsEl = document.getElementById("total-posts");
        const totalCommentsEl = document.getElementById("total-comments");
        const totalLikesEl = document.getElementById("total-likes");

        if (totalPostsEl) totalPostsEl.innerText = postsCount || 0;
        if (totalCommentsEl) totalCommentsEl.innerText = commentsCount || 0;
        if (totalLikesEl) totalLikesEl.innerText = likesCount || 0;

    } catch (err) {
        console.error("Error in loadStats:", err);
    }
}

async function loadAllPost() {
    try {
        const { data: posts, error } = await supabase
            .from('post_app_table')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById("posts-table-body");
        if (!tableBody) return;

        if (posts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No posts available.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";

        posts.forEach((post, index) => {
            tableBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <strong>${post.user_name || 'Anonymous'}</strong><br>
                        <small class="text-muted">${post.email || ''}</small>
                    </td>
                    <td>${post.title || 'No Title'}</td>
                    <td class="text-truncate" style="max-width: 250px;">${post.description || ''}</td>
                    <td>
                        <div class="d-flex flex-column gap-2" style="max-width: 100px;">
                            <button class="btn btn-sm btn-outline-info px-3 w-100" 
                                    onclick="openEditMode('${post.id}', '${post.title}', '${post.description}')"
                                    style="border-radius: 6px; font-weight: 500; transition: all 0.2s ease;">
                                <i class="bi bi-pencil-square me-1"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger px-3 w-100" 
                                    onclick="deletePost('${post.id}')"
                                    style="border-radius: 6px; font-weight: 500; transition: all 0.2s ease;">
                                <i class="bi bi-trash3 me-1"></i> Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading posts:", err);
    }
}

async function loadAllComments() {
    try {
        const { data: comments, error } = await supabase
            .from('comment_table')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById("comments-table-body");
        if (!tableBody) return;

        if (comments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No comments available.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";

        comments.forEach((comment, index) => {
            tableBody.innerHTML += `
                <tr id="comment-row-${comment.id}">
                    <td>${index + 1}</td>
                    <td><strong>${comment.user_name || 'Anonymous'}</strong></td>
                    <td>${comment.comment_text || comment.text || 'No comment text'}</td>
                    <td>Post #${comment.post_id || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger px-3 me-1" onclick="deleteComment('${comment.id}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading comments:", err);
    }
}

function openEditMode(id, title, description) {
    document.getElementById('edit-post-id').value = id;
    document.getElementById('edit-post-title').value = title;
    document.getElementById('edit-post-desc').value = description;

    const editModal = new bootstrap.Modal(document.getElementById('editPostModal'));
    editModal.show();
}

async function updatePostData() {
    const postId = document.getElementById('edit-post-id').value;
    const updatedTitle = document.getElementById('edit-post-title').value;
    const updatedDesc = document.getElementById('edit-post-desc').value;

    if (!updatedTitle.trim() || !updatedDesc.trim()) {
        Swal.fire({
            icon: 'error',
            title: 'Fields Empty',
            text: 'Title and Description cannot be empty!',
            background: '#15222e',
            color: '#f3f4f6'
        });
        return;
    }

    try {
        const { error } = await supabase
            .from('post_app_table')
            .update({
                title: updatedTitle,
                description: updatedDesc
            })
            .eq('id', postId);

        if (error) throw error;

        const modalEl = document.getElementById('editPostModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) {
            modalInstance.hide();
        }

        Swal.fire({
            title: 'Updated!',
            text: 'Post has been updated successfully.',
            icon: 'success',
            iconColor: '#10b981',
            background: '#15222e',
            color: '#f3f4f6',
            timer: 1500,
            showConfirmButton: false
        });

        await loadAllPost();

    } catch (err) {
        Swal.fire({
            title: 'Error!',
            text: err.message,
            icon: 'error',
            background: '#15222e',
            color: '#f3f4f6'
        });
        console.error("Update error:", err);
    }
}

async function deletePost(postId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this post!",
        icon: 'warning',
        iconColor: '#f59e0b',
        showCancelButton: true,
        confirmButtonColor: '#0d9488',
        cancelButtonColor: '#e11d48',
        confirmButtonText: '<i class="bi bi-trash"></i> Yes, delete it!',
        cancelButtonText: 'Cancel',
        background: '#15222e',
        color: '#f3f4f6',
        customClass: { popup: 'rounded-4 border border-secondary shadow-lg' }
    });

    if (result.isConfirmed) {
        try {
            const { error } = await supabase
                .from('post_app_table')
                .delete()
                .eq('id', postId);

            if (error) throw error;

            Swal.fire({
                title: 'Deleted!',
                text: 'Post has been removed.',
                icon: 'success',
                iconColor: '#10b981',
                background: '#15222e',
                color: '#f3f4f6',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-4 border border-secondary' }
            });

            await loadAllPost();
            await loadStats();

        } catch (err) {
            Swal.fire({
                title: 'Error!',
                text: err.message,
                icon: 'error',
                background: '#15222e',
                color: '#f3f4f6'
            });
        }
    }
}

async function deleteComment(commentId) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "This comment will be permanently deleted!",
        icon: 'warning',
        iconColor: '#f59e0b',
        showCancelButton: true,
        confirmButtonColor: '#0d9488',
        cancelButtonColor: '#e11d48',
        confirmButtonText: '<i class="bi bi-trash"></i> Yes, delete it!',
        cancelButtonText: 'Cancel',
        background: '#15222e',
        color: '#f3f4f6',
        customClass: { popup: 'rounded-4 border border-secondary shadow-lg' }
    });

    if (result.isConfirmed) {
        try {
            const { error } = await supabase
                .from('comment_table')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            Swal.fire({
                title: 'Deleted!',
                text: 'Comment has been removed.',
                icon: 'success',
                iconColor: '#10b981',
                background: '#15222e',
                color: '#f3f4f6',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-4 border border-secondary' }
            });

            await loadAllComments();
            await loadStats(); // 👈 Fixed function call (previously fetchStats)

        } catch (err) {
            Swal.fire({
                title: 'Error!',
                text: err.message,
                icon: 'error',
                background: '#15222e',
                color: '#f3f4f6'
            });
        }
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('d-none');
        section.classList.remove('active-section');
    });

    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
        targetSection.classList.remove('d-none');
        targetSection.classList.add('active-section');
    }

    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.getElementById(`tab-${sectionId}`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

async function logoutAdmin() {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You will be logged out of the admin panel!",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#4b5563',
        confirmButtonText: 'Yes, Log out',
        background: '#15222e',
        color: '#f3f4f6'
    });

    if (result.isConfirmed) {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            Swal.fire({
                title: 'Logged Out!',
                text: 'Redirecting to login page...',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#15222e',
                color: '#f3f4f6'
            });

            setTimeout(() => {
                window.location.href = "adminlogin.html";
            }, 1500);

        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message,
                background: '#15222e',
                color: '#f3f4f6'
            });
        }
    }
}

// Mobile sidebar logic
document.addEventListener("DOMContentLoaded", () => {
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebar = document.querySelector(".sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const navLinks = document.querySelectorAll(".sidebar .nav-link");

    function toggleSidebar() {
        sidebar.classList.toggle("show");
        sidebarOverlay.classList.toggle("show");
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", toggleSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", toggleSidebar);
    }

    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth < 992) {
                sidebar.classList.remove("show");
                sidebarOverlay.classList.remove("show");
            }
        });
    });

    // Custom pointer initialization
    let pointer = document.getElementById("pointer");
    if (!pointer) {
        pointer = document.createElement("div");
        pointer.id = "pointer";
        document.body.appendChild(pointer);
    }

    if (typeof gsap !== 'undefined') {
        gsap.set(pointer, { xPercent: -50, yPercent: -50 });
        window.addEventListener("mousemove", (e) => {
            gsap.to(pointer, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.12,
                ease: "power2.out"
            });
        });
    }
});
// Admin Realtime Notifications Listener Setup
let unreadCount = 0;

function setupAdminNotifications() {
    const badge = document.getElementById("notifBadge");

    // =========================
    // NEW COMMENT
    // =========================
    supabase
        .channel('admin-comments-channel')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'comment_table'
            },
            async (payload) => {

                const comment = payload.new;

                pushNotification(
                    "New Comment",
                    `${comment.user_name || 'Someone'} commented on Post #${comment.post_id || ''}`,
                    "bi bi-chat-left-dots-fill"
                );

                await loadAllComments();
                await loadStats();

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'New Comment!',
                    text: `${comment.user_name || 'Someone'} added a comment.`,
                    showConfirmButton: false,
                    timer: 4000,
                    timerProgressBar: true,
                    background: '#15222e',
                    color: '#fff'
                });
            }
        )
        .subscribe();


    // =========================
    // NEW POST
    // =========================
    supabase
        .channel('admin-posts-channel')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'post_app_table'
            },
            async (payload) => {

                const post = payload.new;

                pushNotification(
                    "New Post Created",
                    `Title: ${(post.title || 'Untitled').substring(0, 30)}`,
                    "bi bi-file-earmark-plus-fill"
                );

                await loadAllPost();
                await loadStats();

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'New Post!',
                    text: post.title || 'A new post was created.',
                    showConfirmButton: false,
                    timer: 4000,
                    timerProgressBar: true,
                    background: '#15222e',
                    color: '#fff'
                });
            }
        )
        .subscribe();


    // =========================
    // NEW USER
    // =========================
    supabase
        .channel('admin-users-channel')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'users'
            },
            (payload) => {

                const user = payload.new;

                pushNotification(
                    "New User Registered",
                    `${user.full_name || 'A new user'} created an account.`,
                    "bi bi-person-plus-fill"
                );

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'New User!',
                    text: 'A new user has registered.',
                    showConfirmButton: false,
                    timer: 4000,
                    timerProgressBar: true,
                    background: '#15222e',
                    color: '#fff'
                });
            }
        )
        .subscribe();
}
function pushNotification(title, message, iconClass) {
    const notifList = document.getElementById("notifList");
    const noNotifMsg = document.getElementById("noNotifMsg");
    const badge = document.getElementById("notifBadge");

    if (noNotifMsg) {
        noNotifMsg.remove();
    }

    unreadCount++;

    if (badge) {
        badge.innerText = unreadCount;
        badge.classList.remove("d-none");
    }

    if (!notifList) return;

    const notifItem = document.createElement("li");

    notifItem.className =
        "p-2 border-bottom border-secondary d-flex align-items-center gap-2";

    notifItem.innerHTML = `
        <i class="${iconClass} text-info fs-5"></i>

        <div>
            <strong class="d-block text-white" style="font-size: 0.85rem;">
                ${title}
            </strong>

            <small class="text-muted" style="font-size: 0.75rem;">
                ${message}
            </small>
        </div>
    `;

    notifList.prepend(notifItem);
}
document.getElementById("notifBellBtn")?.addEventListener("click", () => {
    unreadCount = 0;

    const badge = document.getElementById("notifBadge");

    if (badge) {
        badge.innerText = "0";
        badge.classList.add("d-none");
    }
});

window.setupAdminNotifications = setupAdminNotifications;
// Window Exports
window.logoutAdmin = logoutAdmin;
window.showSection = showSection;
window.deletePost = deletePost;
window.deleteComment = deleteComment;
window.deleteUser = deleteUser;
window.loadStats = loadStats;
window.loadAllPost = loadAllPost;
window.loadAllComments = loadAllComments;
window.loadAllUsers = loadAllUsers;
window.updatePostData = updatePostData;
window.openEditMode = openEditMode;