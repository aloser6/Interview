package handlers

import (
	"encoding/json"
	"mforum/models"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/mozillazg/go-pinyin"
	"gorm.io/gorm"
)

// 定义分组后的论坛数据结构
type ForumGroup struct {
	Letter string         `json:"letter"`
	Forums []models.Forum `json:"forums"`
}

type PostRequest struct {
	ForumName string `json:"forumName" binding:"required"`
	Title     string `json:"title" binding:"required"`
	Content   string `json:"content" binding:"required"`
}

type CommentRequest struct {
	PostID  int    `json:"postId" binding:"required"`
	Content string `json:"content" binding:"required"`
}

type ReplyRequest struct {
	PostID    uint   `json:"postId" binding:"required"`
	CommentID uint   `json:"commentId" binding:"required"`
	Content   string `json:"content" binding:"required"`
}

type CreateForumRequest struct {
	Name        string `form:"name" binding:"required"`
	Description string `form:"description" binding:"required"`
}

type LikePostRequest struct {
	PostID string `json:"postId" binding:"required"`
	Action string `json:"action" binding:"required,oneof=like unlike"`
}

type LikeCommentRequest struct {
	CommentID string `json:"commentId" binding:"required"`
	Action    string `json:"action" binding:"required,oneof=like unlike"`
}

type CheckLikeStatusRequest struct {
	PostIDs    []string `json:"postIds"`
	CommentIDs []string `json:"commentIds"`
}

func CreateForum(c *gin.Context) {
	var req CreateForumRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误"}, "data": nil})
		return
	}
	file, err := c.FormFile("icon")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "未上传头像文件"}, "data": nil})
		return
	}
	username, _ := c.Get("username")
	var existingForum models.Forum
	if err := models.DB.Where("name = ?", req.Name).First(&existingForum).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"status": gin.H{"code": 409, "message": "论坛名已存在"}, "data": nil})
		return
	}
	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	dst := filepath.Join("./picture", filename)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "保存头像失败"}, "data": nil})
		return
	}
	forum := models.Forum{
		Name:        req.Name,
		Icon:        "/picture/" + filename,
		Description: req.Description,
		Creator:     username.(string), // 设置创建者
	}
	if err := models.DB.Create(&forum).Error; err != nil {
		os.Remove(dst)
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "创建论坛失败"}, "data": nil})
		return
	}
	follow := models.Follow{
		ForumID:  forum.ID,
		Username: username.(string),
	}
	models.DB.Create(&follow)
	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "创建论坛成功"}, "data": forum})
}
func GetFollowedForums(c *gin.Context) {
	username := c.Query("username")
	action := c.Query("action")
	if action != "list" || username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "无效参数"}, "data": nil})
		return
	}

	var follows []models.Forum
	if err := models.DB.Joins("JOIN follows ON follows.forum_id = forums.id").
		Where("follows.username = ?", username).
		Order("forums.name ASC").
		Find(&follows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取关注论坛失败"}, "data": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "获取关注论坛成功"}, "data": follows})
}

func CreatePost(c *gin.Context) {
	username, _ := c.Get("username")
	// 接收表单数据，包括标题、内容和图片
	title := c.PostForm("title")
	content := c.PostForm("content")
	forumName := c.PostForm("forumName")

	if title == "" || content == "" || forumName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "标题、内容或论坛名称不能为空"}, "data": nil})
		return
	}

	// 验证论坛是否存在
	var forum models.Forum
	if err := models.DB.Where("name = ?", forumName).First(&forum).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "论坛不存在"}, "data": nil})
		return
	}

	// 处理图片上传
	var imageURLs []string
	form, err := c.MultipartForm()
	if err == nil {
		files := form.File["images"]
		for _, file := range files {
			ext := filepath.Ext(file.Filename)
			filename := uuid.New().String() + ext
			dst := filepath.Join("./picture", filename)
			if err := c.SaveUploadedFile(file, dst); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "保存图片失败"}, "data": nil})
				return
			}
			imageURLs = append(imageURLs, "/picture/"+filename)
		}
	}

	// 将图片路径序列化为 JSON
	imagesJSON, err := json.Marshal(imageURLs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "序列化图片路径失败"}, "data": nil})
		return
	}

	// 创建帖子
	post := models.Post{
		ForumName: forumName,
		Username:  username.(string),
		Title:     title,
		Content:   content,
		Images:    string(imagesJSON),
	}

	if err := models.DB.Create(&post).Error; err != nil {
		// 删除已上传的图片
		for _, url := range imageURLs {
			os.Remove(strings.TrimPrefix(url, "/picture/"))
		}
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "创建帖子失败"}, "data": nil})
		return
	}

	// 获取发帖人头像
	var user models.User
	models.DB.Where("username = ?", username).First(&user)

	// 返回包含 forumIcon 和 userAvatar 的数据
	type PostResponse struct {
		models.Post
		UserAvatar string `json:"userAvatar"`
		ForumIcon  string `json:"forumIcon"`
	}
	postResponse := PostResponse{
		Post:       post,
		UserAvatar: user.Avatar,
		ForumIcon:  forum.Icon,
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "创建帖子成功"}, "data": postResponse})
}
func CreateComment(c *gin.Context) {
	var req CommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误"}, "data": nil})
		return
	}

	username, _ := c.Get("username")
	postID := req.PostID
	var post models.Post
	if err := models.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "帖子不存在"}, "data": nil})
		return
	}

	comment := models.Comment{
		PostID:   uint(postID),
		Username: username.(string),
		Content:  req.Content,
	}

	if err := models.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "创建评论失败"}, "data": nil})
		return
	}

	models.DB.Model(&post).Update("comments", post.Comments+1)
	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "创建评论成功"}, "data": comment})
}

func CreateReply(c *gin.Context) {
	var req ReplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误: " + err.Error()}, "data": nil})
		return
	}

	username, _ := c.Get("username")
	var post models.Post
	if err := models.DB.First(&post, req.PostID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "帖子不存在"}, "data": nil})
		return
	}

	var parentComment models.Comment
	if err := models.DB.First(&parentComment, req.CommentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "父评论不存在"}, "data": nil})
		return
	}

	// 构造带有 @ 被回复人用户名的内容
	replyContent := "@" + parentComment.Username + ": " + req.Content

	reply := models.Comment{
		PostID:   req.PostID,
		Username: username.(string),
		Content:  replyContent, // 使用修改后的内容
		ParentID: req.CommentID,
	}

	if err := models.DB.Create(&reply).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "创建回复失败"}, "data": nil})
		return
	}

	models.DB.Model(&parentComment).Update("comments", parentComment.Comments+1)
	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "创建回复成功"}, "data": reply})
}

type FavoritePostRequest struct {
	PostID string `json:"postId" binding:"required"`
	Action string `json:"action" binding:"required,oneof=favorite unfavorite"`
}

// type LikePostRequest struct {
// 	PostID string `json:"postId" binding:"required"`
// 	Action string `json:"action" binding:"required,oneof=like unlike"`
// }

type FollowForumRequest struct {
	ForumName string `json:"forumName" binding:"required"`
	Action    string `json:"action" binding:"required,oneof=follow unfollow"`
}

func FavoritePost(c *gin.Context) {
	var req FavoritePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误"}, "data": nil})
		return
	}

	username, _ := c.Get("username")
	postID, _ := strconv.Atoi(req.PostID)
	var post models.Post
	if err := models.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "帖子不存在"}, "data": nil})
		return
	}

	favorite := models.Favorite{
		PostID:   uint(postID),
		Username: username.(string),
	}

	if req.Action == "favorite" {
		if err := models.DB.Where("post_id = ? AND username = ?", postID, username).First(&models.Favorite{}).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"status": gin.H{"code": 409, "message": "已收藏该帖子"}, "data": nil})
			return
		}
		if err := models.DB.Create(&favorite).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "收藏失败"}, "data": nil})
			return
		}
		models.DB.Model(&post).Update("favorites", post.Favorites+1)
	} else {
		if err := models.DB.Where("post_id = ? AND username = ?", postID, username).Delete(&models.Favorite{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "取消收藏失败"}, "data": nil})
			return
		}
		if post.Favorites > 0 {
			models.DB.Model(&post).Update("favorites", post.Favorites-1)
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "操作成功"}, "data": nil})
}

func LikePost(c *gin.Context) {
	var req LikePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误: " + err.Error()}, "data": nil})
		return
	}

	username, _ := c.Get("username")
	postID, err := strconv.Atoi(req.PostID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "无效的帖子ID"}, "data": nil})
		return
	}

	var post models.Post
	if err := models.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "帖子不存在"}, "data": nil})
		return
	}

	like := models.Like{
		PostID:   uint(postID),
		Username: username.(string),
	}

	if req.Action == "like" {
		var existingLike models.Like
		// 查询是否已点赞，ErrRecordNotFound表示用户尚未点赞，属于正常情况
		err := models.DB.Where("post_id = ? AND username = ?", postID, username).First(&existingLike).Error
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{"status": gin.H{"code": 409, "message": "已点赞该帖子"}, "data": nil})
			return
		}
		if err != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "检查点赞状态失败: " + err.Error()}, "data": nil})
			return
		}
		// 创建新点赞记录
		if err := models.DB.Create(&like).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "点赞失败: " + err.Error()}, "data": nil})
			return
		}
		// 更新帖子点赞数
		models.DB.Model(&post).Update("likes", post.Likes+1)
	} else {
		// 删除点赞记录
		result := models.DB.Where("post_id = ? AND username = ?", postID, username).Delete(&models.Like{})
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "取消点赞失败: " + result.Error.Error()}, "data": nil})
			return
		}
		if result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "未找到点赞记录"}, "data": nil})
			return
		}
		// 更新帖子点赞数
		if post.Likes > 0 {
			models.DB.Model(&post).Update("likes", post.Likes-1)
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "操作成功"}, "data": nil})
}

func LikeComment(c *gin.Context) {
	var req LikeCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误: " + err.Error()}, "data": nil})
		return
	}

	username, _ := c.Get("username")
	commentID, err := strconv.Atoi(req.CommentID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "无效的评论ID"}, "data": nil})
		return
	}

	var comment models.Comment
	if err := models.DB.First(&comment, commentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "评论不存在"}, "data": nil})
		return
	}

	commentLike := models.CommentLike{
		CommentID: uint(commentID),
		Username:  username.(string),
	}

	if req.Action == "like" {
		var existingLike models.CommentLike
		// 查询是否已点赞，ErrRecordNotFound表示用户尚未点赞，属于正常情况
		err := models.DB.Where("comment_id = ? AND username = ?", commentID, username).First(&existingLike).Error
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{"status": gin.H{"code": 409, "message": "已点赞该评论"}, "data": nil})
			return
		}
		if err != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "检查点赞状态失败: " + err.Error()}, "data": nil})
			return
		}
		// 创建新点赞记录
		if err := models.DB.Create(&commentLike).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "点赞失败: " + err.Error()}, "data": nil})
			return
		}
		// 更新评论点赞数
		models.DB.Model(&comment).Update("likes", comment.Likes+1)
	} else {
		// 删除点赞记录
		result := models.DB.Where("comment_id = ? AND username = ?", commentID, username).Delete(&models.CommentLike{})
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "取消点赞失败: " + result.Error.Error()}, "data": nil})
			return
		}
		if result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "未找到点赞记录"}, "data": nil})
			return
		}
		// 更新评论点赞数
		if comment.Likes > 0 {
			models.DB.Model(&comment).Update("likes", comment.Likes-1)
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "操作成功"}, "data": nil})
}

func CheckLikeStatus(c *gin.Context) {
	var req CheckLikeStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误: " + err.Error()}, "data": nil})
		return
	}

	username, _ := c.Get("username")
	postLikes := make(map[string]bool)
	commentLikes := make(map[string]bool)

	// 查询帖子点赞状态
	if len(req.PostIDs) > 0 {
		var likes []models.Like
		if err := models.DB.Where("post_id IN ? AND username = ?", req.PostIDs, username).Find(&likes).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "查询帖子点赞状态失败: " + err.Error()}, "data": nil})
			return
		}
		for _, like := range likes {
			postLikes[strconv.Itoa(int(like.PostID))] = true
		}
	}

	// 查询评论点赞状态
	if len(req.CommentIDs) > 0 {
		var commentLikesResult []models.CommentLike
		if err := models.DB.Where("comment_id IN ? AND username = ?", req.CommentIDs, username).Find(&commentLikesResult).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "查询评论点赞状态失败: " + err.Error()}, "data": nil})
			return
		}
		for _, like := range commentLikesResult {
			commentLikes[strconv.Itoa(int(like.CommentID))] = true
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": gin.H{"code": 200, "message": "查询成功"},
		"data":   gin.H{"postLikes": postLikes, "commentLikes": commentLikes},
	})
}

func FollowForum(c *gin.Context) {
	var req FollowForumRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误"}, "data": nil})
		return
	}
	username, _ := c.Get("username")
	var forum models.Forum
	if err := models.DB.Where("name = ?", req.ForumName).First(&forum).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "论坛不存在"}, "data": nil})
		return
	}
	follow := models.Follow{
		ForumID:  forum.ID,
		Username: username.(string),
	}
	if req.Action == "follow" {
		if err := models.DB.Where("forum_id = ? AND username = ?", forum.ID, username).First(&models.Follow{}).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"status": gin.H{"code": 409, "message": "已关注该论坛"}, "data": nil})
			return
		}
		if err := models.DB.Create(&follow).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "关注失败"}, "data": nil})
			return
		}
	} else {
		if err := models.DB.Where("forum_id = ? AND username = ?", forum.ID, username).Delete(&models.Follow{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "取消关注失败"}, "data": nil})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "操作成功"}, "data": nil})
}

func GetPosts(c *gin.Context) {
	typeParam := c.Query("type")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	var posts []models.Post
	query := models.DB.Offset(offset).Limit(limit).Order("created_at DESC")

	switch typeParam {
	case "all":
		// 获取所有帖子
	case "user_posts":
		username := c.Query("username")
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "缺少 username 参数"}, "data": nil})
			return
		}
		query = query.Where("username = ?", username)
	case "user_comments":
		username := c.Query("username")
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "缺少 username 参数"}, "data": nil})
			return
		}
		// 查询用户的评论和回复
		type CommentResponse struct {
			ID        uint      `json:"id"`
			PostID    uint      `json:"postId"`
			Username  string    `json:"username"`
			Content   string    `json:"content"`
			PostTitle string    `json:"postTitle"`
			Time      time.Time `json:"time"`
			ForumName string    `json:"forumName"`
			ForumIcon string    `json:"forumIcon"`
		}
		var commentResponses []CommentResponse
		err := models.DB.Table("comments").
			Select("comments.id, comments.post_id, comments.username, comments.content, posts.title as post_title, comments.created_at as time, forums.name as forum_name, forums.icon as forum_icon").
			Joins("JOIN posts ON comments.post_id = posts.id").
			Joins("JOIN forums ON posts.forum_name = forums.name").
			Where("comments.username = ?", username).
			Order("comments.created_at DESC").
			Offset(offset).
			Limit(limit).
			Scan(&commentResponses).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取评论失败"}, "data": nil})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "获取评论成功"}, "data": commentResponses})
		return
	case "user_favorites":
		// ... 保持不变 ...
	default:
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "无效的 type 参数"}, "data": nil})
		return
	}

	if err := query.Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取帖子失败"}, "data": nil})
		return
	}

	// 添加用户头像和论坛头像
	type PostResponse struct {
		models.Post
		UserAvatar string `json:"userAvatar"`
		ForumIcon  string `json:"forumIcon"`
	}
	var postResponses []PostResponse
	for _, post := range posts {
		var user models.User
		var forum models.Forum
		models.DB.Where("username = ?", post.Username).First(&user)
		models.DB.Where("name = ?", post.ForumName).First(&forum)
		postResponses = append(postResponses, PostResponse{
			Post:       post,
			UserAvatar: user.Avatar,
			ForumIcon:  forum.Icon,
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "获取帖子成功"}, "data": postResponses})
}

func GetPostDetail(c *gin.Context) {
	postID := c.Query("postId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	if postID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "缺少 postId 参数"}, "data": nil})
		return
	}

	var post models.Post
	if err := models.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "帖子不存在"}, "data": nil})
		return
	}

	var user models.User
	models.DB.Where("username = ?", post.Username).First(&user)

	var comments []models.Comment
	if err := models.DB.Where("post_id = ? AND parent_id = 0", postID).Offset(offset).Limit(limit).Order("created_at ASC").Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取评论失败"}, "data": nil})
		return
	}

	type CommentResponse struct {
		models.Comment
		Avatar string `json:"avatar"`
	}
	var commentResponses []CommentResponse
	for _, comment := range comments {
		var commentUser models.User
		models.DB.Where("username = ?", comment.Username).First(&commentUser)
		var replies []models.Comment
		if err := models.DB.Where("post_id = ? AND parent_id = ?", postID, comment.ID).Find(&replies).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取回复失败"}, "data": nil})
			return
		}
		var replyResponses []CommentResponse
		for _, reply := range replies {
			var replyUser models.User
			models.DB.Where("username = ?", reply.Username).First(&replyUser)
			replyResponses = append(replyResponses, CommentResponse{
				Comment: reply,
				Avatar:  replyUser.Avatar,
			})
		}
		comment.Replies = make([]models.Comment, len(replyResponses))
		for i, replyResp := range replyResponses {
			comment.Replies[i] = replyResp.Comment
			comment.Replies[i].Avatar = replyResp.Avatar
		}
		commentResponses = append(commentResponses, CommentResponse{
			Comment: comment,
			Avatar:  commentUser.Avatar,
		})
	}

	type PostDetailResponse struct {
		Post       models.Post       `json:"post"`
		UserAvatar string            `json:"userAvatar"`
		Comments   []CommentResponse `json:"comments"`
	}
	postDetail := PostDetailResponse{
		Post:       post,
		UserAvatar: user.Avatar,
		Comments:   commentResponses,
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "获取帖子详情成功"}, "data": postDetail})
}

func GetForums(c *gin.Context) {
	var forums []models.Forum
	if err := models.DB.Order("name ASC").Find(&forums).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取论坛列表失败"}, "data": nil})
		return
	}

	// 初始化 A-Z 分组
	groupedForums := make(map[string][]models.Forum)
	for i := 'A'; i <= 'Z'; i++ {
		groupedForums[string(i)] = []models.Forum{}
	}
	groupedForums["Other"] = []models.Forum{} // 非 A-Z 分组

	// 配置 go-pinyin
	args := pinyin.NewArgs()
	args.Style = pinyin.NORMAL // 无音调拼音
	args.Heteronym = false     // 禁用多音字

	// 分组论坛
	for _, forum := range forums {
		name := strings.TrimSpace(forum.Name)
		if name == "" {
			groupedForums["Other"] = append(groupedForums["Other"], forum)
			continue
		}

		// 获取首字母
		firstLetter := ""
		firstRune := []rune(name)[0]
		if unicode.IsLetter(firstRune) && !unicode.Is(unicode.Han, firstRune) {
			// 英文或其他字母，直接取首字母
			firstLetter = strings.ToUpper(string(firstRune))
		} else if unicode.Is(unicode.Han, firstRune) {
			// 中文，使用 go-pinyin
			py := pinyin.Pinyin(string(firstRune), args)
			if len(py) > 0 && len(py[0]) > 0 && len(py[0][0]) > 0 {
				firstLetter = strings.ToUpper(string(py[0][0][0]))
			} else {
				firstLetter = "Other"
			}
		} else {
			// 非字母或汉字（如数字、符号）
			firstLetter = "Other"
		}

		// 确保分组存在
		if _, ok := groupedForums[firstLetter]; !ok {
			firstLetter = "Other"
		}
		groupedForums[firstLetter] = append(groupedForums[firstLetter], forum)
	}

	// 转换为返回格式
	var forumGroups []ForumGroup
	for letter := 'A'; letter <= 'Z'; letter++ {
		if len(groupedForums[string(letter)]) > 0 {
			forumGroups = append(forumGroups, ForumGroup{
				Letter: string(letter),
				Forums: groupedForums[string(letter)],
			})
		}
	}
	if len(groupedForums["Other"]) > 0 {
		forumGroups = append(forumGroups, ForumGroup{
			Letter: "Other",
			Forums: groupedForums["Other"],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": gin.H{"code": 200, "message": "获取论坛列表成功"},
		"data":   forumGroups,
	})
}
func GetForumDetail(c *gin.Context) {
	forumName := c.Query("forumName")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	if forumName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "缺少 forumName 参数"}, "data": nil})
		return
	}

	var forum models.Forum
	if err := models.DB.Where("name = ?", forumName).First(&forum).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "论坛不存在"}, "data": nil})
		return
	}

	var posts []models.Post
	if err := models.DB.Where("forum_name = ?", forumName).Offset(offset).Limit(limit).Order("created_at DESC").Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "获取帖子失败"}, "data": nil})
		return
	}

	// 添加用户头像到帖子数据
	type PostResponse struct {
		models.Post
		UserAvatar string `json:"userAvatar"`
	}
	var postResponses []PostResponse
	for _, post := range posts {
		var user models.User
		models.DB.Where("username = ?", post.Username).First(&user)
		postResponses = append(postResponses, PostResponse{
			Post:       post,
			UserAvatar: user.Avatar,
		})
	}

	forumDetail := struct {
		Forum models.Forum   `json:"forum"`
		Posts []PostResponse `json:"posts"`
	}{Forum: forum, Posts: postResponses}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "获取论坛详情成功"}, "data": forumDetail})
}

// 删除请求结构体
type DeleteRequest struct {
	Type string `json:"type" binding:"required,oneof=forum post comment"` // 删除类型：forum, post, comment
	ID   uint   `json:"id" binding:"required"`                            // 改回 uint 类型
}

// DeleteContent 处理删除论坛、帖子、评论/回复的请求
func DeleteContent(c *gin.Context) {
	var req DeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "请求参数错误: " + err.Error()}, "data": nil})
		return
	}

	username, _ := c.Get("username")
	tx := models.DB.Begin() // 开启事务
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "服务器内部错误"}, "data": nil})
		}
	}()

	switch req.Type {
	case "forum":
		var forum models.Forum
		if err := tx.First(&forum, req.ID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "论坛不存在"}, "data": nil})
			return
		}
		if forum.Creator != username {
			tx.Rollback()
			c.JSON(http.StatusForbidden, gin.H{"status": gin.H{"code": 403, "message": "无权限删除此论坛"}, "data": nil})
			return
		}
		// 删除论坛（相关帖子、评论、关注记录由外键级联删除）
		if err := tx.Delete(&forum).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "删除论坛失败"}, "data": nil})
			return
		}

	case "post":
		var post models.Post
		if err := tx.First(&post, req.ID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "帖子不存在"}, "data": nil})
			return
		}
		if post.Username != username {
			tx.Rollback()
			c.JSON(http.StatusForbidden, gin.H{"status": gin.H{"code": 403, "message": "无权限删除此帖子"}, "data": nil})
			return
		}
		// 删除帖子（相关评论、点赞、收藏由外键级联删除）
		if err := tx.Delete(&post).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "删除帖子失败"}, "data": nil})
			return
		}

	case "comment":
		var comment models.Comment
		if err := tx.First(&comment, req.ID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "评论或回复不存在"}, "data": nil})
			return
		}
		if comment.Username != username {
			tx.Rollback()
			c.JSON(http.StatusForbidden, gin.H{"status": gin.H{"code": 403, "message": "无权限删除此评论或回复"}, "data": nil})
			return
		}
		// 如果是顶级评论，更新帖子评论数；如果是回复，更新父评论回复数
		if comment.ParentID == 0 {
			var post models.Post
			if err := tx.First(&post, comment.PostID).Error; err == nil && post.Comments > 0 {
				tx.Model(&post).Update("comments", post.Comments-1)
			}
		} else {
			var parentComment models.Comment
			if err := tx.First(&parentComment, comment.ParentID).Error; err == nil && parentComment.Comments > 0 {
				tx.Model(&parentComment).Update("comments", parentComment.Comments-1)
			}
		}
		// 删除评论（相关回复、点赞由外键级联删除）
		if err := tx.Delete(&comment).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "删除评论或回复失败"}, "data": nil})
			return
		}

	default:
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"status": gin.H{"code": 400, "message": "无效的删除类型"}, "data": nil})
		return
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"status": gin.H{"code": 500, "message": "提交事务失败"}, "data": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": gin.H{"code": 200, "message": "删除成功"}, "data": nil})
}
