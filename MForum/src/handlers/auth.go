package handlers

import (
	"mforum/middleware"
	"mforum/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Account  string `form:"account" binding:"required,len=9"`
	Password string `form:"password" binding:"required,min=6,max=16"`
}

type RegisterRequest struct {
	Username string `form:"username" binding:"required,min=2,max=64"`
	Account  string `form:"account" binding:"required,len=9"`
	Password string `form:"password" binding:"required,min=6,max=16"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误"}, "data": nil})
		return
	}

	var user models.User
	if err := models.DB.Where("account = ?", req.Account).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": gin.H{"code": 401, "message": "账号或密码错误"}, "data": nil})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": gin.H{"code": 401, "message": "账号或密码错误"}, "data": nil})
		return
	}

	token, err := middleware.GenerateJWT(user.Username, user.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "生成令牌失败"}, "data": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": gin.H{"code": 200, "message": "登录成功"},
		"data": gin.H{
			"token":    token,
			"username": user.Username,
			"userId":   user.UserID,
			"avatar":   user.Avatar, // 添加头像
		},
	})
}

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误"}, "data": nil})
		return
	}

	var existingUser models.User
	if err := models.DB.Where("account = ?", req.Account).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "账号已存在"}, "data": nil})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "服务器错误"}, "data": nil})
		return
	}

	user := models.User{
		UserID:   uuid.New().String(),
		Username: req.Username,
		Account:  req.Account,
		Password: string(hashedPassword),
		Avatar:   "/picture/default-user.png", // 默认头像
	}

	if err := models.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "注册失败"}, "data": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": gin.H{"code": 200, "message": "注册成功"},
		"data": gin.H{
			"username": user.Username,
			"userId":   user.UserID,
			"avatar":   user.Avatar, // 添加头像
		},
	})
}
