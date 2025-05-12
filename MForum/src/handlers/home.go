package handlers

import (
	"mforum/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetSlides(c *gin.Context) {
	var slides []models.Slide
	if err := models.DB.Find(&slides).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取轮播图失败"}, "data": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "获取轮播图成功"}, "data": slides})
}

func GetUserStatus(c *gin.Context) {
	username, _ := c.Get("username")
	userID, _ := c.Get("userId")

	var user models.User
	if err := models.DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取用户信息失败"}, "data": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": gin.H{"code": 200, "message": "用户状态获取成功"},
		"data": gin.H{
			"isLoggedIn": true,
			"username":   username,
			"userId":     userID,
			"avatar":     user.Avatar, // 添加头像
		},
	})
}
