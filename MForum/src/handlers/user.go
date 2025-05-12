package handlers

import (
	"mforum/models"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserProfileResponse struct {
	Username  string           `json:"username"`
	UserID    string           `json:"userId"`
	Avatar    string           `json:"avatar"` // 新增头像字段
	Posts     []models.Post    `json:"posts"`
	Comments  []models.Comment `json:"comments"`
	Favorites []models.Post    `json:"favorites"`
	Follows   []models.Forum   `json:"follows"`
}

func GetUserProfile(c *gin.Context) {
	username := c.Query("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "缺少 username 参数"}, "data": nil})
		return
	}

	var user models.User
	if err := models.DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "用户不存在"}, "data": nil})
		return
	}

	var posts []models.Post
	if err := models.DB.Where("username = ?", username).Order("created_at DESC").Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取用户帖子失败"}, "data": nil})
		return
	}

	var comments []models.Comment
	if err := models.DB.Where("username = ?", username).Order("created_at DESC").Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取用户评论失败"}, "data": nil})
		return
	}

	var favorites []models.Post
	if err := models.DB.Joins("JOIN favorites ON favorites.post_id = posts.id").
		Where("favorites.username = ?", username).
		Order("posts.created_at DESC").
		Find(&favorites).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取用户收藏失败"}, "data": nil})
		return
	}

	var follows []models.Forum
	if err := models.DB.Joins("JOIN follows ON follows.forum_id = forums.id").
		Where("follows.username = ?", username).
		Order("forums.name ASC").
		Find(&follows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取用户关注失败"}, "data": nil})
		return
	}

	response := UserProfileResponse{
		Username:  user.Username,
		UserID:    user.UserID,
		Avatar:    user.Avatar, // 确保返回头像
		Posts:     posts,
		Comments:  comments,
		Favorites: favorites,
		Follows:   follows,
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "获取用户资料成功"}, "data": response})
}

func UpdateUserAvatar(c *gin.Context) {
	username, _ := c.Get("username")
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "未上传头像文件"}, "data": nil})
		return
	}

	var user models.User
	if err := models.DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "用户不存在"}, "data": nil})
		return
	}

	// 删除旧头像（如果不是默认头像）
	if user.Avatar != "/picture/default-user.png" {
		os.Remove("." + user.Avatar)
	}

	// 保存新头像
	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	dst := filepath.Join("./picture", filename)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "保存头像失败"}, "data": nil})
		return
	}

	user.Avatar = "/picture/" + filename
	if err := models.DB.Save(&user).Error; err != nil {
		os.Remove(dst)
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "更新头像失败"}, "data": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "更新头像成功"}, "data": gin.H{"avatar": user.Avatar}})
}
