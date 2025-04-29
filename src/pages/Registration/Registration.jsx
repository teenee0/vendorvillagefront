import React, { useState } from 'react';
import { FaFacebookF, FaGoogle, FaLinkedinIn } from 'react-icons/fa';
// import axios from 'axios';
import axios from "../../api/axiosDefault.js";
import { useNavigate } from 'react-router-dom';
import './Registration.css';


const AuthPage = () => {
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', email: '', password1: '', password2: '' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleSignUpClick = () => setIsRightPanelActive(true);
  const handleSignInClick = () => setIsRightPanelActive(false);

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        'accounts/api/auth/login/',
        { username: loginData.email, password: loginData.password },
        { withCredentials: true }  // 🔥 Важно для отправки куков
      );

      navigate('/account');
    } catch (error) {
      setErrors({ login: 'Неверные учетные данные' });
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (registerData.password1 !== registerData.password2) {
      setErrors({ register: 'Пароли не совпадают' });
      return;
    }
    if (registerData.password1.length < 8) {
      setErrors({ register: 'Пароль должен быть не менее 8 символов' });
      return;
    }
    try {
      const response = await axios.post(
        'accounts/api/auth/register/',
        {
          username: registerData.username,
          email: registerData.email,
          password1: registerData.password1,
          password2: registerData.password2,
        },
        { withCredentials: true }
      );
      console.log(response);
      navigate('/account');
    } catch (error) {
      const err = error.response?.data;
      setErrors({ register: err?.non_field_errors || 'Ошибка регистрации' });
    }
  };
  

  return (
    <div className="auth-page">
      <h2>Добро пожаловать!</h2>
      <div className={`auth-container ${isRightPanelActive ? 'right-panel-active' : ''}`}>
        <div className="form-container sign-up-container">
          <form onSubmit={handleRegisterSubmit}>
            <h1>Регистрация</h1>
            <div className="social-container">
              <a href="#" className="social"><FaFacebookF /></a>
              <a href="#" className="social"><FaGoogle /></a>
              <a href="#" className="social"><FaLinkedinIn /></a>
            </div>
            <span>или используйте email для регистрации</span>
            <input type="text" name="username" placeholder="Имя пользователя" value={registerData.username} onChange={handleRegisterChange} required />
            <input type="email" name="email" placeholder="Email" value={registerData.email} onChange={handleRegisterChange} required />
            <input type="password" name="password1" placeholder="Пароль" value={registerData.password1} onChange={handleRegisterChange} required />
            <input type="password" name="password2" placeholder="Подтвердите пароль" value={registerData.password2} onChange={handleRegisterChange} required />
            {errors.register && <div className="error-message">{errors.register}</div>}
            <button type="submit">Зарегистрироваться</button>
          </form>
        </div>
        <div className="form-container sign-in-container">
          <form onSubmit={handleLoginSubmit}>
            <h1>Вход</h1>
            <div className="social-container">
              <a href="#" className="social"><FaFacebookF /></a>
              <a href="#" className="social"><FaGoogle /></a>
              <a href="#" className="social"><FaLinkedinIn /></a>
            </div>
            <span>или используйте ваш аккаунт</span>
            <input type="text" name="email" placeholder="Email" value={loginData.email} onChange={handleLoginChange} required />
            <input type="password" name="password" placeholder="Пароль" value={loginData.password} onChange={handleLoginChange} required />
            {errors.login && <div className="error-message">{errors.login}</div>}
            <a href="#">Забыли пароль?</a>
            <button type="submit">Войти</button>
          </form>
        </div>
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>Уже с нами?!</h1>
              <p>Войдите, чтобы продолжить работу с вашим аккаунтом</p>
              <button className="ghost" onClick={handleSignInClick}>Войти</button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>Привет, друг!</h1>
              <p>Зарегистрируйтесь, чтобы начать работу с нами</p>
              <button className="ghost" onClick={handleSignUpClick}>Регистрация</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
