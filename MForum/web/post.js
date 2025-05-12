const darkModeToggle = document.getElementById('dark-mode-toggle'),
      modeIcon = document.querySelector('.mode-icon'),
      modeText = document.querySelector('.mode-text'),
      logoIcon = document.querySelector('.logo-icon'),
      BASE_URL = 'http://127.0.0.1:8080';
let createPostHandler = null;
let showingAll = false; // 提升到全局作用域，保持状态
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
    modeIcon.textContent = '🌙';
    modeText.textContent = '黑夜';
    logoIcon.src = '/picture/MForumB.ico';
} else {
    darkModeToggle.checked = false;
    modeIcon.textContent = '☀️';
    modeText.textContent = '白天';
    logoIcon.src = '/picture/MForumW.ico';
}

darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    modeIcon.textContent = isDarkMode ? '🌙' : '☀️';
    modeText.textContent = isDarkMode ? '黑夜' : '白天';
    logoIcon.src = isDarkMode ? '/picture/MForumB.ico' : '/picture/MForumW.ico';
});

const navItems = document.querySelectorAll('.nav-menu .nav-item'),
      sections = document.querySelectorAll('.content-section');

navItems.forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const section = item.getAttribute('data-section');
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(section).classList.add('active');
        if (section === 'forums') renderForums();
        else if (section === 'posts') renderPosts();
    });
});

const profileNavItems = document.querySelectorAll('.profile-nav .nav-item'),
      subSections = document.querySelectorAll('.subcontent-section');

profileNavItems.forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        profileNavItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const subsection = item.getAttribute('data-subsection');
        subSections.forEach(s => s.classList.remove('active'));
        document.getElementById(subsection).classList.add('active');
        const username = document.getElementById('profile-user-name').textContent;
        if (subsection === 'user-posts') renderUserPosts(username);
        else if (subsection === 'user-comments') renderUserComments(username);
        else if (subsection === 'user-favorites') renderUserFavorites(username);
    });
});

async function fetchData(url, params = {}, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' },
          token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const config = { method, headers };
    if (method === 'GET') {
        const queryString = new URLSearchParams(params).toString();
        url = queryString ? `${url}?${queryString}` : url;
    } else if (body) {
        config.body = JSON.stringify(body);
    }
    const response = await fetch(url, config);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.status || typeof result.status.code !== 'number') throw new Error('Invalid response format');
    return result;
}

async function renderPosts() {
    const postsSection = document.getElementById('posts');
    postsSection.innerHTML = '<p>加载中...</p>';
    try {
        const result = await fetchData('/post/posts', { type: 'all', page: 1, limit: 10 });
        if (result.status.code > 0) {
            const postsData = result.data || [];
            postsSection.innerHTML = '';
            postsData.forEach((post, index) => {
                const createdAt = post.created_at ? new Date(post.created_at).toLocaleString() : '未知时间';
                let imagePreview = '';
                if (post.images) {
                    const images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
                    if (Array.isArray(images) && images.length > 0) {
                        imagePreview = `
                            <div class="post-preview-images">
                                ${images.slice(0, 3).map(img => `
                                    <img src="${img}" alt="预览图片" style="max-width: 150px; max-height: 150px; margin: 5px; border-radius: 4px; object-fit: cover;">
                                `).join('')}
                                ${images.length > 3 ? `<span class="more-images-hint">+${images.length - 3}</span>` : ''}
                            </div>
                        `;
                    }
                }
                const postElement = document.createElement('div');
                postElement.classList.add('post');
                postElement.innerHTML = `
                    <div class="post-header">
                        <img src="${post.forumIcon}" alt="${post.forumName}" class="forum-icon">
                        <div>
                            <span class="forum-name">${post.forumName}</span>
                            <span class="post-meta">${createdAt}</span>
                            <div class="username">${post.username}</div>
                        </div>
                    </div>
                    <div class="post-title">${post.title}</div>
                    <div class="post-content">${post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content}</div>
                    ${imagePreview}
                    <div class="post-actions">
                        <div class="action-item">
                            <svg class="action-icon like-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                            ${post.likes}
                        </div>
                        <div class="action-item">
                            <svg class="action-icon comment-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                            </svg>
                            ${post.comments}
                        </div>
                    </div>
                    ${index < postsData.length - 1 ? '<hr>' : ''}
                `;
                addPostEventListeners(postElement, post);
                postsSection.appendChild(postElement);
            });
        } else {
            postsSection.innerHTML = '<p>加载帖子失败</p>';
        }
    } catch (error) {
        postsSection.innerHTML = '<p>网络错误</p>';
    }
}

async function renderForums() {
    const forumsSection = document.getElementById('forums');
    forumsSection.innerHTML = '<p>加载中...</p>';
    try {
        const result = await fetchData('/post/forums', { page: 1, limit: 10 });
        if (result.status.code > 0) {
            const forumGroups = result.data || [];
            forumsSection.innerHTML = '';
            forumGroups.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.classList.add('forum-group');
                groupDiv.innerHTML = `<h2>${group.letter}</h2>`;
                const forumList = document.createElement('div');
                forumList.classList.add('forum-list');
                group.forums.sort((a, b) => a.name.localeCompare(b.name)).forEach(forum => {
                    const forumItem = document.createElement('div');
                    forumItem.classList.add('forum-item');
                    forumItem.innerHTML = `<img src="${forum.icon}" alt="${forum.name}" onerror="this.src='/picture/default-user.png'"><span>${forum.name}</span>`;
                    forumItem.addEventListener('click', () => renderForumDetail(forum));
                    forumList.appendChild(forumItem);
                });
                groupDiv.appendChild(forumList);
                forumsSection.appendChild(groupDiv);
            });
        } else {
            forumsSection.innerHTML = '<p>加载论坛失败</p>';
        }
    } catch (error) {
        forumsSection.innerHTML = '<p>网络错误</p>';
    }
}

async function renderFollowedForums() {
    const followedList = document.getElementById('followed-list'),
          showMore = document.getElementById('show-more');
    followedList.innerHTML = '<p>加载中...</p>';
    try {
        const result = await fetchData('/post/follow-forum', { action: 'list', username: localStorage.getItem('username') });
        if (result.status.code === 200) {
            const followedForums = result.data || [];
            followedList.innerHTML = '';
            const displayForums = showingAll ? followedForums.sort((a, b) => a.name.localeCompare(b.name)) : followedForums.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5);
            displayForums.forEach(forum => {
                const li = document.createElement('li');
                li.innerHTML = `<img src="${forum.icon}" alt="${forum.name}" onerror="this.src='/picture/default-user.png'"><span>${forum.name}</span>`;
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => renderForumDetail(forum));
                followedList.appendChild(li);
            });
            // 修正按钮文本逻辑
            showMore.textContent = showingAll && followedForums.length > 5 ? '收起' : '更多';
            showMore.style.display = followedForums.length <= 5 ? 'none' : 'block';
        } else {
            followedList.innerHTML = '<p>加载关注失败</p>';
        }
    } catch (error) {
        followedList.innerHTML = '<p>网络错误</p>';
    }
}

async function renderUserProfile(username) {
    sections.forEach(s => s.classList.remove('active'));
    const profileSection = document.getElementById('profile');
    profileSection.classList.add('active');
    try {
        const result = await fetchData('/user/user-profile', { username });
        if (result.status.code > 0) {
            const user = result.data;
            const userIcon = document.getElementById('profile-user-icon'),
                  userName = document.getElementById('profile-user-name'),
                  profileIcon = document.getElementById('user-profile-icon');
            userIcon.src = user.avatar || '/picture/default-user.png';
            userName.textContent = user.username;
            profileIcon.src = user.avatar || '/picture/default-user.png';
            localStorage.setItem('userAvatar', user.avatar || '/picture/default-user.png');
            const existingForm = profileSection.querySelector('.avatar-upload-form');
            if (existingForm) existingForm.remove();
            const avatarForm = document.createElement('div');
            avatarForm.classList.add('avatar-upload-form');
            avatarForm.innerHTML = `
                <label class="avatar-upload-btn" title="上传新头像">
                    <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
                    <svg class="upload-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                </label>
            `;
            profileSection.querySelector('.profile-header').appendChild(avatarForm);
            const avatarInput = document.getElementById('avatar-upload');
            avatarInput.addEventListener('change', async () => {
                const file = avatarInput.files[0];
                if (file) {
                    const formData = new FormData();
                    formData.append('avatar', file);
                    try {
                        const response = await fetch(`${BASE_URL}/user/update-avatar`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                            body: formData
                        });
                        const result = await response.json();
                        if (result.status.code > 0) {
                            const newAvatar = result.data.avatar;
                            userIcon.src = newAvatar;
                            profileIcon.src = newAvatar;
                            localStorage.setItem('userAvatar', newAvatar);
                            alert('头像上传成功');
                        } else {
                            alert('头像上传失败: ' + result.status.message);
                        }
                    } catch (error) {
                        alert('上传头像时发生网络错误');
                    }
                }
            });
            renderUserPosts(username);
        }
    } catch (error) {}
}

async function renderUserPosts(username) {
    const postsSection = document.getElementById('user-posts');
    postsSection.innerHTML = '<p>加载中...</p>';
    try {
        const result = await fetchData('/post/posts', { type: 'user_posts', username, page: 1, limit: 10 });
        if (result.status.code > 0) {
            const userPosts = result.data || [];
            postsSection.innerHTML = userPosts.length === 0 ? '<p>暂无发帖</p>' : '';
            userPosts.forEach((post, index) => {
                const postElement = document.createElement('div');
                postElement.classList.add('post');
                // 格式化时间
                const time = post.created_at ? new Date(post.created_at).toLocaleString() : '未知时间';
                // 确保字段存在
                const title = post.title || '未知标题';
                const forumName = post.forumName || '未知论坛';
                const forumIcon = post.forumIcon || '/picture/default-user.png';
                postElement.innerHTML = `
                    <div class="post-header">
                        <img src="${forumIcon}" alt="${forumName}" class="forum-icon">
                        <div>
                            <span class="forum-name">${forumName}</span>
                            <span class="post-meta">${time}</span>
                        </div>
                    </div>
                    <div class="post-title">${title}</div>
                    <div class="post-content">${post.content}</div>
                    ${index < userPosts.length - 1 ? '<hr>' : ''}
                `;
                addPostEventListeners(postElement, { ...post, id: post.id });
                postsSection.appendChild(postElement);
            });
        } else {
            postsSection.innerHTML = '<p>加载失败</p>';
        }
    } catch (error) {
        postsSection.innerHTML = '<p>网络错误</p>';
    }
}

async function renderUserComments(username) {
    const commentsSection = document.getElementById('user-comments');
    commentsSection.innerHTML = '<p>加载中...</p>';
    try {
        const result = await fetchData('/post/posts', { type: 'user_comments', username, page: 1, limit: 10 });
        if (result.status.code > 0) {
            const userComments = result.data || [];
            commentsSection.innerHTML = userComments.length === 0 ? '<p>暂无评论</p>' : '';
            userComments.forEach((comment, index) => {
                const postElement = document.createElement('div');
                postElement.classList.add('post');
                // 格式化时间
                const time = comment.time ? new Date(comment.time).toLocaleString() : '未知时间';
                // 确保字段存在
                const postTitle = comment.postTitle || '未知标题';
                const forumName = comment.forumName || '未知论坛';
                const forumIcon = comment.forumIcon || '/picture/default-user.png';
                postElement.innerHTML = `
                    <div class="post-header">
                        <img src="${forumIcon}" alt="${forumName}" class="forum-icon">
                        <div>
                            <span class="forum-name">${forumName}</span>
                            <span class="post-meta">${time}</span>
                        </div>
                    </div>
                    <div class="post-title">${postTitle}</div>
                    <div class="post-content">${comment.content}</div>
                    ${index < userComments.length - 1 ? '<hr>' : ''}
                `;
                addPostEventListeners(postElement, { ...comment, title: postTitle, id: comment.postId });
                commentsSection.appendChild(postElement);
            });
        } else {
            commentsSection.innerHTML = '<p>加载失败</p>';
        }
    } catch (error) {
        commentsSection.innerHTML = '<p>网络错误</p>';
    }
}

async function renderUserFavorites(username) {
    document.getElementById('user-favorites').innerHTML = '<p>收藏功能暂不可用</p>';
}

function addCreatePostButtonListener(container, forumName) {
    if (createPostHandler) container.removeEventListener('click', createPostHandler);
    createPostHandler = e => handleCreatePostClick(e, forumName);
    container.addEventListener('click', createPostHandler);
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function handleCreatePostClick(e, forumName) {
    if (e.target.classList.contains('create-post-btn')) {
        e.preventDefault();
        debouncedCreatePost(forumName);
    }
}

const debouncedCreatePost = debounce(createPost, 300);

async function renderForumDetail(forum) {
    sections.forEach(s => s.classList.remove('active'));
    const forumsSection = document.getElementById('forums');
    forumsSection.classList.add('active');
    forumsSection.innerHTML = '<p>加载中...</p>';
    try {
        const result = await fetchData('/post/forum-detail', { forumName: forum.name, page: 1, limit: 10 });
        let isFollowed = false;
        let isCreator = false;
        try {
            const followResult = await fetchData('/post/follow-forum', { action: 'list', username: localStorage.getItem('username') });
            isFollowed = followResult.status.code === 200 && followResult.data.some(f => f.name === forum.name);
            isCreator = result.data.forum.creator === localStorage.getItem('username');
        } catch (error) {}
        if (result.status.code > 0) {
            const filteredPosts = result.data.posts || [];
            forumsSection.innerHTML = `
                <div class="forum-detail">
                    <div class="forum-detail-header">
                        <img src="${forum.icon}" alt="${forum.name}" class="forum-detail-icon">
                        <h1 class="forum-detail-title">${forum.name}</h1>
                        <button class="follow-forum-btn" data-processing="false">${isFollowed ? '取消关注' : '关注'}</button>
                        ${isCreator ? '<button class="delete-forum-btn" data-forum-id="' + forum.id + '">删除论坛</button>' : ''}
                    </div>
                    <div class="forum-detail-description">${forum.description}</div>
                    <hr class="forum-detail-divider">
                    <div class="forum-detail-posts">
                        ${filteredPosts.length > 0 ? filteredPosts.map((post, index) => {
                            let imagePreview = '';
                            if (post.images) {
                                const images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
                                if (Array.isArray(images) && images.length > 0) {
                                    imagePreview = `
                                        <div class="post-preview-images">
                                            ${images.slice(0, 3).map(img => `
                                                <img src="${img}" alt="预览图片" style="max-width: 150px; max-height: 150px; margin: 5px; border-radius: 4px; object-fit: cover;">
                                            `).join('')}
                                            ${images.length > 3 ? `<span class="more-images-hint">+${images.length - 3}张</span>` : ''}
                                        </div>
                                    `;
                                }
                            }
                            return `
                                <div class="post">
                                    <div class="post-header">
                                        <img src="${post.userAvatar || '/picture/default-user.png'}" alt="${post.username}" class="user-icon" data-username="${post.username}">
                                        <div>
                                            <span class="user-name">${post.username}</span>
                                            <span class="post-meta">${post.created_at ? new Date(post.created_at).toLocaleString() : '未知时间'}</span>
                                        </div>
                                    </div>
                                    <div class="post-title">${post.title}</div>
                                    <div class="post-content">${post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content}</div>
                                    ${imagePreview}
                                    <div class="post-actions">
                                        <div class="action-item">
                                            <svg class="action-icon like-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                            ${post.likes}
                                        </div>
                                        <div class="action-item">
                                            <svg class="action-icon comment-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                            </svg>
                                            ${post.comments}
                                        </div>
                                    </div>
                                    ${index < filteredPosts.length - 1 ? '<hr>' : ''}
                                </div>
                            `;
                        }).join('') : '<p>暂无帖子</p>'}
                    </div>
                    <button class="create-post-btn">+</button>
                </div>
            `;
            const postElements = forumsSection.querySelectorAll('.post');
            postElements.forEach(postElement => {
                postElement.style.cursor = 'pointer';
                postElement.addEventListener('click', e => {
                    if (!e.target.closest('.user-icon')) {
                        const postId = filteredPosts[Array.from(postElements).indexOf(postElement)].id;
                        renderPostDetail(postId);
                    }
                });
            });
            addUserIconEventListeners(forumsSection);
            addCreatePostButtonListener(forumsSection, forum.name);
            const followBtn = forumsSection.querySelector('.follow-forum-btn');
            followBtn.addEventListener('click', async () => {
                if (followBtn.dataset.processing === 'true') return;
                followBtn.dataset.processing = 'true';
                followBtn.disabled = true;
                const action = isFollowed ? 'unfollow' : 'follow';
                try {
                    const result = await fetchData('/post/follow-forum', {}, 'POST', { forumName: forum.name, action });
                    if (result.status.code === 200) {
                        isFollowed = !isFollowed;
                        followBtn.textContent = isFollowed ? '取消关注' : '关注';
                        await renderFollowedForums();
                    } else {
                        alert(`操作失败: ${result.status.message}`);
                    }
                } catch (error) {
                    alert('操作失败，请检查网络');
                } finally {
                    followBtn.dataset.processing = 'false';
                    followBtn.disabled = false;
                }
            });
            // 绑定删除论坛按钮事件
            const deleteForumBtn = forumsSection.querySelector('.delete-forum-btn');
            if (deleteForumBtn) {
                deleteForumBtn.addEventListener('click', () => {
                    if (confirm('确定要删除此论坛吗？此操作不可恢复！')) {
                        deleteContent('forum', Number(forum.id), () => { // 确保 ID 是数字
                            renderForums();
                        });
                    }
                });
            }
        } else {
            forumsSection.innerHTML = '<p>加载失败</p>';
        }
    } catch (error) {
        forumsSection.innerHTML = '<p>网络错误</p>';
    }
}

async function renderPostDetail(postId) {
    sections.forEach(s => s.classList.remove('active'));
    const postsSection = document.getElementById('posts');
    postsSection.classList.add('active');
    try {
        const result = await fetchData('/post/post-detail', { postId });
        if (result.status.code > 0) {
            const post = result.data.post,
                  postComments = result.data.comments || [],
                  createdAt = post.created_at ? new Date(post.created_at).toLocaleString() : '未知时间';
            let images = [];
            if (post.images) {
                if (typeof post.images === 'string' && post.images.trim()) {
                    images = JSON.parse(post.images);
                } else if (Array.isArray(post.images)) {
                    images = post.images;
                }
            }
            if (!Array.isArray(images)) images = [];
            const imageSection = images.length > 0 
                ? `<div class="post-images">${images.map(img => `<img src="${img}" alt="Post image" style="max-width: 100%; margin-top: 10px;">`).join('')}</div>`
                : '';
            let likeStatus = { data: { postLikes: {}, commentLikes: {} }, status: { code: 0 } };
            try {
                const commentIds = postComments.flatMap(comment => [comment.id.toString(), ...(comment.replies || []).map(reply => reply.id.toString())]);
                likeStatus = await fetchData('/post/check-like', {}, 'POST', { postIds: [post.id.toString()], commentIds });
            } catch (error) {}
            postsSection.innerHTML = `
                <div class="post-detail">
                    <div class="post-header">
                        <img src="${result.data.userAvatar || '/picture/default-user.png'}" alt="${post.username}" class="post-detail-user-icon" data-username="${post.username}">
                        <span class="post-detail-user-name">${post.username}</span>
                        <span class="comment-time">${createdAt}</span>
                        ${post.username === localStorage.getItem('username') ? `<button class="delete-post-btn" data-post-id="${post.id}">删除</button>` : ''}
                    </div>
                    <div class="post-detail-title">${post.title}</div>
                    <div class="post-detail-content">${post.content}</div>
                    ${imageSection}
                    <div class="post-detail-actions">
                        <div class="action-item like-btn ${likeStatus.data.postLikes[post.id] ? 'liked' : ''}" data-post-id="${post.id}">
                            <svg class="action-icon like-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                            <span class="like-count">${post.likes}</span>
                        </div>
                        <div class="action-item">
                            <svg class="action-icon comment-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                            </svg>
                            ${post.comments}
                        </div>
                    </div>
                    <hr class="post-detail-divider">
                    <div class="post-detail-comments">
                        ${postComments.length > 0 ? postComments.map(comment => {
                            const replies = comment.replies || [];
                            return `
                                <div class="comment" data-comment-id="${comment.id}">
                                    <div class="comment-header">
                                        <img src="${comment.avatar || '/picture/default-user.png'}" alt="${comment.username}" class="comment-user-icon" data-username="${comment.username}">
                                        <span class="comment-user-name">${comment.username}</span>
                                        <span class="comment-time">${comment.created_at ? new Date(comment.created_at).toLocaleString() : '未知时间'}</span>
                                        ${comment.username === localStorage.getItem('username') ? `<button class="delete-comment-btn" data-comment-id="${comment.id}">删除</button>` : ''}
                                    </div>
                                    <div class="comment-content">${comment.content}</div>
                                    <div class="comment-actions">
                                        <div class="action-item like-btn ${likeStatus.data.commentLikes[comment.id] ? 'liked' : ''}" data-comment-id="${comment.id}">
                                            <svg class="action-icon like-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                            <span class="like-count">${comment.likes}</span>
                                        </div>
                                        <div class="action-item reply-btn">
                                            <svg class="action-icon comment-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                            </svg>
                                            回复
                                        </div>
                                    </div>
                                    <div class="replies" style="display: ${replies.length > 0 ? 'block' : 'none'};">
                                        ${replies.length > 0 ? replies.map(reply => `
                                            <div class="reply">
                                                <div class="reply-header">
                                                    <img src="${reply.avatar || '/picture/default-user.png'}" alt="${reply.username}" class="reply-user-icon" data-username="${reply.username}">
                                                    <span class="reply-user-name">${reply.username}</span>
                                                    <span class="reply-time">${reply.created_at ? new Date(reply.created_at).toLocaleString() : '未知时间'}</span>
                                                    ${reply.username === localStorage.getItem('username') ? `<button class="delete-comment-btn" data-comment-id="${reply.id}">删除</button>` : ''}
                                                </div>
                                                <div class="reply-content">
                                                    ${reply.targetUsername ? `<span class="reply-target">@${reply.targetUsername}</span>` : ''}${reply.content}
                                                </div>
                                                <div class="reply-actions">
                                                    <div class="action-item like-btn ${likeStatus.data.commentLikes[reply.id] ? 'liked' : ''}" data-comment-id="${reply.id}">
                                                        <svg class="action-icon like-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                                        </svg>
                                                        <span class="like-count">${reply.likes}</span>
                                                    </div>
                                                    <div class="action-item reply-btn">
                                                        <svg class="action-icon comment-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                                                        </svg>
                                                        回复
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('') : ''}
                                    </div>
                                    ${replies.length > 0 ? '<span class="toggle-replies"></span>' : ''}
                                </div>
                            `;
                        }).join('') : '<p>暂无评论</p>'}
                    </div>
                    <button class="create-post-btn">+</button>
                </div>
            `;
            addUserIconEventListeners(postsSection);
            document.querySelector('.create-post-btn').addEventListener('click', () => createComment(postId));
            postsSection.querySelectorAll('.reply-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const commentElement = btn.closest('.comment');
                    const commentId = commentElement.dataset.commentId;
                    createReply(postId, commentId);
                });
            });
            postsSection.querySelectorAll('.toggle-replies').forEach(toggle => {
                toggle.addEventListener('click', () => {
                    const replies = toggle.previousElementSibling;
                    replies.style.display = replies.style.display === 'block' ? 'none' : 'block';
                });
            });
            postsSection.querySelectorAll('.like-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (btn.classList.contains('disabled')) return;
                    btn.classList.add('disabled');
                    const postId = btn.dataset.postId,
                          commentId = btn.dataset.commentId;
                    try {
                        if (postId) {
                            const result = await fetchData('/post/like-post', {}, 'POST', { postId, action: 'like' });
                            if (result.status.code === 200) {
                                const likeCount = btn.querySelector('.like-count');
                                likeCount.textContent = parseInt(likeCount.textContent) + 1;
                                btn.classList.add('liked');
                            } else if (result.status.code !== 409) {
                                alert('点赞失败: ' + result.status.message);
                            }
                        } else if (commentId) {
                            const result = await fetchData('/post/like-comment', {}, 'POST', { commentId, action: 'like' });
                            if (result.status.code === 200) {
                                const likeCount = btn.querySelector('.like-count');
                                likeCount.textContent = parseInt(likeCount.textContent) + 1;
                                btn.classList.add('liked');
                            } else if (result.status.code !== 409) {
                                alert('点赞失败: ' + result.status.message);
                            }
                        }
                    } catch (error) {
                        alert('点赞时发生网络错误');
                    } finally {
                        btn.classList.remove('disabled');
                    }
                });
            });
            // 绑定删除帖子按钮事件
            const deletePostBtn = postsSection.querySelector('.delete-post-btn');
            if (deletePostBtn) {
                deletePostBtn.addEventListener('click', () => {
                    if (confirm('确定要删除此帖子吗？')) {
                        deleteContent('post', postId, () => {
                            renderPosts();
                        });
                    }
                });
            }
            // 绑定删除评论/回复按钮事件
            postsSection.querySelectorAll('.delete-comment-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (confirm('确定要删除此评论或回复吗？')) {
                        const commentId = btn.dataset.commentId;
                        deleteContent('comment', commentId, () => {
                            renderPostDetail(postId);
                        });
                    }
                });
            });
        }
    } catch (error) {
        postsSection.innerHTML = '<p>网络错误</p>';
    }
}

function addPostEventListeners(postElement, post) {
    postElement.style.cursor = 'pointer';
    postElement.addEventListener('click', e => {
        if (!e.target.closest('.forum-icon') && !e.target.closest('.forum-name')) {
            renderPostDetail(post.id);
        }
    });
}

function addUserIconEventListeners(container) {
    const userIcons = container.querySelectorAll('.user-icon, .comment-user-icon, .reply-user-icon, .post-detail-user-icon');
    userIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const username = icon.dataset.username;
            renderUserProfile(username);
        });
    });
}

function createComment(postId) {
    // 检查是否已存在模态窗口
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        const textarea = existingModal.querySelector('#comment-content');
        if (textarea) textarea.focus();
        return;
    }

    // 创建模态窗口
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>发表评论</h2>
            <form id="create-comment-form">
                <div class="form-group">
                    <label for="comment-content">评论内容</label>
                    <textarea id="comment-content" name="content" class="form-input" placeholder="请输入评论..." required></textarea>
                </div>
                <div class="form-actions">
                    <button type="submit">提交</button>
                    <button type="button" class="cancel-btn">取消</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    console.log('Comment modal created with textarea:', modal.querySelectorAll('.form-input').length);

    // 获取表单和取消按钮
    const form = modal.querySelector('#create-comment-form');
    const cancelBtn = modal.querySelector('.cancel-btn');

    // 提交表单事件
    const submitHandler = async (e) => {
        e.preventDefault();
        const content = form.querySelector('#comment-content').value.trim();

        if (content) {
            try {
                const result = await fetchData('/post/comment', {}, 'POST', { postId, content });
                if (result.status.code === 200) {
                    document.body.removeChild(modal);
                    renderPostDetail(postId);
                } else {
                    alert('评论失败: ' + result.status.message);
                }
            } catch (error) {
                alert('提交评论时发生网络错误');
            }
        }
    };

    // 取消按钮事件
    const cancelHandler = () => {
        document.body.removeChild(modal);
    };

    // 绑定事件监听器
    form.addEventListener('submit', submitHandler);
    cancelBtn.addEventListener('click', cancelHandler);

    // 聚焦到评论输入框
    const textarea = modal.querySelector('#comment-content');
    if (textarea) textarea.focus();
}


function createPost(forumName) {
    // 检查是否已存在模态窗口
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        const input = existingModal.querySelector('#post-title');
        if (input) input.focus();
        return;
    }

    // 创建模态窗口
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>发布帖子</h2>
            <form id="create-post-form">
                <div class="form-group">
                    <label for="post-title">帖子标题</label>
                    <input type="text" id="post-title" name="title" class="form-input" placeholder="请输入标题" required>
                </div>
                <div class="form-group">
                    <label for="post-content">帖子内容</label>
                    <textarea id="post-content" name="content" class="form-input" placeholder="请输入内容" required></textarea>
                </div>
                <div class="form-group">
                    <label for="post-images">上传图片</label>
                    <input type="file" id="post-images" name="images" class="form-input" accept="image/*" multiple>
                </div>
                <div class="form-actions">
                    <button type="submit">发布</button>
                    <button type="button" class="cancel-btn">取消</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    console.log('Post modal created with input fields:', modal.querySelectorAll('.form-input').length);

    // 获取表单和取消按钮
    const form = modal.querySelector('#create-post-form');
    const cancelBtn = modal.querySelector('.cancel-btn');

    // 提交表单事件
    const submitHandler = async (e) => {
        e.preventDefault();
        const title = form.querySelector('#post-title').value.trim();
        const content = form.querySelector('#post-content').value.trim();
        const files = form.querySelector('#post-images').files;

        if (title && content) {
            const formData = new FormData();
            formData.append('forumName', forumName);
            formData.append('title', title);
            formData.append('content', content);
            for (let i = 0; i < files.length; i++) formData.append('images', files[i]);

            try {
                const response = await fetch(`${BASE_URL}/post/create`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: formData
                });
                const result = await response.json();
                if (result.status.code === 200) {
                    document.body.removeChild(modal);
                    const forumResult = await fetchData('/post/forum-detail', { forumName });
                    if (forumResult.status.code === 200) {
                        renderForumDetail(forumResult.data.forum);
                    }
                } else {
                    alert('创建帖子失败: ' + result.status.message);
                }
            } catch (error) {
                alert('创建帖子失败，请检查网络');
            }
        } else {
            alert('标题和内容不能为空');
        }
    };

    // 取消按钮事件
    const cancelHandler = () => {
        document.body.removeChild(modal);
    };

    // 绑定事件监听器
    form.addEventListener('submit', submitHandler);
    cancelBtn.addEventListener('click', cancelHandler);

    // 聚焦到标题输入框
    const input = modal.querySelector('#post-title');
    if (input) input.focus();
}

function createReply(postId, commentId) {
    // 检查是否已存在模态窗口
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        const textarea = existingModal.querySelector('#reply-content');
        if (textarea) textarea.focus();
        return;
    }

    // 创建模态窗口
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>回复评论</h2>
            <form id="create-reply-form">
                <div class="form-group">
                    <label for="reply-content">回复内容</label>
                    <textarea id="reply-content" name="content" class="form-input" placeholder="请输入回复..." required></textarea>
                </div>
                <div class="form-actions">
                    <button type="submit">提交</button>
                    <button type="button" class="cancel-btn">取消</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    console.log('Reply modal created with textarea:', modal.querySelectorAll('.form-input').length);

    // 获取表单和取消按钮
    const form = modal.querySelector('#create-reply-form');
    const cancelBtn = modal.querySelector('.cancel-btn');

    // 提交表单事件
    const submitHandler = async (e) => {
        e.preventDefault();
        const content = form.querySelector('#reply-content').value.trim();

        if (content) {
            try {
                const result = await fetchData('/post/reply', {}, 'POST', { postId: Number(postId), commentId: Number(commentId), content });
                if (result.status.code === 200) {
                    document.body.removeChild(modal);
                    renderPostDetail(postId);
                } else {
                    alert('回复失败: ' + result.status.message);
                }
            } catch (error) {
                alert('提交回复时发生网络错误');
            }
        }
    };

    // 取消按钮事件
    const cancelHandler = () => {
        document.body.removeChild(modal);
    };

    // 绑定事件监听器
    form.addEventListener('submit', submitHandler);
    cancelBtn.addEventListener('click', cancelHandler);

    // 聚焦到回复输入框
    const textarea = modal.querySelector('#reply-content');
    if (textarea) textarea.focus();
}

function createForum() {
    // 检查是否已存在模态窗口
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        const input = existingModal.querySelector('#forum-name');
        if (input) input.focus();
        return;
    }

    // 创建模态窗口
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>创建论坛</h2>
            <form id="create-forum-form">
                <div class="form-group">
                    <label for="forum-name">论坛名称</label>
                    <input type="text" id="forum-name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="forum-description">论坛描述</label>
                    <textarea id="forum-description" name="description" required></textarea>
                </div>
                <div class="form-group">
                    <label for="forum-icon">论坛图标</label>
                    <input type="file" id="forum-icon" name="icon" accept="image/*" required>
                </div>
                <div class="form-actions">
                    <button type="submit">创建</button>
                    <button type="button" class="cancel-btn">取消</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // 获取表单和取消按钮
    const form = modal.querySelector('#create-forum-form');
    const cancelBtn = modal.querySelector('.cancel-btn');

    // 提交表单事件
    const submitHandler = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', form.querySelector('#forum-name').value);
        formData.append('description', form.querySelector('#forum-description').value);
        formData.append('icon', form.querySelector('#forum-icon').files[0]);

        try {
            const response = await fetch('/post/create-forum', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            const result = await response.json();
            if (result.status.code === 200) {
                document.body.removeChild(modal);
                await renderFollowedForums();
            } else {
                alert(`创建失败: ${result.status.message}`);
            }
        } catch (error) {
            alert('创建失败，请检查网络');
        }
    };

    // 取消按钮事件
    const cancelHandler = () => {
        document.body.removeChild(modal);
    };

    // 绑定事件监听器
    form.addEventListener('submit', submitHandler);
    cancelBtn.addEventListener('click', cancelHandler);

    // 聚焦到输入框
    const input = modal.querySelector('#forum-name');
    if (input) input.focus();
}

renderPosts();
renderFollowedForums();
document.getElementById('user-profile-icon').addEventListener('click', () => renderUserProfile(localStorage.getItem('username')));
document.getElementById('create-forum-btn').addEventListener('click', createForum);
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token'),
          profileIcon = document.getElementById('user-profile-icon'),
          storedAvatar = localStorage.getItem('userAvatar');
    if (token && storedAvatar) {
        profileIcon.src = storedAvatar;
    } else if (token) {
        fetch(`${BASE_URL}/home/user/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(result => {
            if (result.status.code === 200) {
                const username = result.data.username;
                fetchData('/user/user-profile', { username })
                    .then(profileResult => {
                        if (profileResult.status.code > 0) {
                            const avatar = profileResult.data.avatar || '/picture/default-user.png';
                            profileIcon.src = avatar;
                            localStorage.setItem('userAvatar', avatar);
                        }
                    });
            }
        });
    }
});

// 为 showMore 按钮添加事件监听器（仅绑定一次）
document.getElementById('show-more').addEventListener('click', e => {
    e.preventDefault();
    showingAll = !showingAll;
    renderFollowedForums();
});

async function deleteContent(type, id, callback) {
    if (deleteContent.isProcessing) return;
    deleteContent.isProcessing = true;
    console.log('Deleting:', { type, id, typeOfId: typeof id }); // 调试 ID 类型
    try {
        const response = await fetch(`${BASE_URL}/post/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ type, id: Number(id) })
        });
        const result = await response.json();
        if (result.status.code === 200) {
            alert('删除成功');
            if (callback) callback();
        } else {
            alert(`删除失败: ${result.status.message}`);
        }
    } catch (error) {
        alert('删除时发生网络错误');
    } finally {
        deleteContent.isProcessing = false;
    }
}