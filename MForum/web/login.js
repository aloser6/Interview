// 表单元素
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const accountInput = document.getElementById('account');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const authBtn = document.getElementById('auth-btn');
const formHeader = document.getElementById('form-header');
const switchModeLink = document.getElementById('switch-mode');
const switchText = document.querySelector('.switch-text');
const registerInputs = document.querySelectorAll('.register-only');
const errorMessage = document.getElementById('error-message');
const togglePasswordButtons = document.querySelectorAll('.toggle-password');

// 模式状态
let isRegisterMode = false;

// 服务器地址
const BASE_URL = 'http://127.0.0.1:8080';

// 表单验证
function checkInputs() {
    const account = accountInput.value.trim();
    const password = passwordInput.value.trim();

    if (isRegisterMode) {
        const username = usernameInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        const usernameValid = username.length >= 2 && username.length <= 64;
        const accountValid = /^[0-9]{9}$/.test(account);
        const passwordValid = password.length >= 6 && password.length <= 16;
        const confirmPasswordValid = password === confirmPassword;

        if (!usernameValid) {
            errorMessage.textContent = '用户名长度需在2-64字符之间';
        } else if (!accountValid) {
            errorMessage.textContent = '账号需为9位数字';
        } else if (!passwordValid) {
            errorMessage.textContent = '密码长度需在6-16字符之间';
        } else if (!confirmPasswordValid) {
            errorMessage.textContent = '两次输入的密码不一致';
        } else {
            errorMessage.textContent = '';
        }

        authBtn.disabled = !(usernameValid && accountValid && passwordValid && confirmPasswordValid);
    } else {
        const accountValid = /^[0-9]{9}$/.test(account);
        const passwordValid = password.length >= 6 && password.length <= 16;

        if (!accountValid) {
            errorMessage.textContent = '账号需为9位数字';
        } else if (!passwordValid) {
            errorMessage.textContent = '密码长度需在6-16字符之间';
        } else {
            errorMessage.textContent = '';
        }

        authBtn.disabled = !(accountValid && passwordValid);
    }
}

accountInput.addEventListener('input', checkInputs);
passwordInput.addEventListener('input', checkInputs);
usernameInput.addEventListener('input', checkInputs);
confirmPasswordInput.addEventListener('input', checkInputs);

// 查看密码功能
togglePasswordButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input.type === 'password') {
            input.type = 'text';
            button.classList.add('active');
        } else {
            input.type = 'password';
            button.classList.remove('active');
        }
    });
});

// 表单提交
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.textContent = '';

    if (isRegisterMode) {
        const registerData = {
            username: usernameInput.value.trim(),
            account: accountInput.value.trim(),
            password: passwordInput.value.trim()
        };
        try {
            const response = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData)
            });
            const result = await response.json();
            if (response.ok && result.status.code > 0) {
                alert('注册成功，请登录');
                window.location.href = '/web/login.html';
            } else {
                errorMessage.textContent = result.status.message || '注册失败';
            }
        } catch (error) {
            errorMessage.textContent = '网络错误，请稍后重试';
            console.error('Register error:', error);
        }
    } else {
        const loginData = {
            account: accountInput.value.trim(),
            password: passwordInput.value.trim()
        };
        try {
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });
            const result = await response.json();
            if (response.ok && result.status.code > 0) {
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('username', result.data.username);
                localStorage.setItem('userId', result.data.userId);
                await syncUserInfo(result.data.token);
                window.location.href = '/web/post.html';
            } else {
                errorMessage.textContent = result.status.message || '登录失败';
            }
        } catch (error) {
            errorMessage.textContent = '网络错误，请稍后重试';
            console.error('Login error:', error);
        }
    }
});

// 同步用户信息
async function syncUserInfo(token) {
    try {
        const response = await fetch(`${BASE_URL}/home/user/status`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (response.ok && result.data.isLoggedIn) {
            localStorage.setItem('username', result.data.username);
            localStorage.setItem('userId', result.data.userId);
        }
    } catch (error) {
        console.error('Sync user info error:', error);
    }
}

// 切换模式
function toggleMode() {
    isRegisterMode = !isRegisterMode;
    formHeader.textContent = isRegisterMode ? '注册 MForum' : '登录 MForum';
    authBtn.textContent = isRegisterMode ? '注册' : '登录';
    switchText.innerHTML = isRegisterMode ? '已有账号？<a href="#" id="switch-mode">登录</a>' : '没有账号？<a href="#" id="switch-mode">注册</a>';
    registerInputs.forEach(input => input.style.display = isRegisterMode ? 'block' : 'none');
    errorMessage.textContent = '';
    checkInputs();

    document.getElementById('switch-mode').addEventListener('click', (e) => {
        e.preventDefault();
        toggleMode();
    });
}

switchModeLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMode();
});

// 黑夜模式同步与图标切换
const logoIcon = document.querySelector('.logo-icon');
const titleIcon = document.querySelector('.title-icon');

if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    logoIcon.src = '/picture/MForumB.ico';
    titleIcon.src = '/picture/MForumB.ico';
} else {
    document.body.classList.remove('dark-mode');
    logoIcon.src = '/picture/MForumW.ico';
    titleIcon.src = '/picture/MForumW.ico';
}

// 初始化验证
checkInputs();