package routes

import (
	"mforum/handlers"
	"mforum/middleware"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// 托管静态文件
	r.Static("/web", "./web")
	r.Static("/picture", "./picture")

	// 页面路由
	r.GET("/", func(c *gin.Context) {
		if _, err := os.Stat("./web/index.html"); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "主页文件未找到"}, "data": nil})
			return
		}
		c.File("./web/index.html")
	})
	r.GET("/login", func(c *gin.Context) {
		if _, err := os.Stat("./web/login.html"); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "登录页面文件未找到"}, "data": nil})
			return
		}
		c.File("./web/login.html")
	})
	r.GET("/post", func(c *gin.Context) {
		if _, err := os.Stat("./web/post.html"); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"status": gin.H{"code": 404, "message": "帖子页面文件未找到"}, "data": nil})
			return
		}
		c.File("./web/post.html")
	})

	// home 模块
	home := r.Group("/home")
	{
		home.GET("/slides", handlers.GetSlides)
		home.GET("/user/status", middleware.AuthMiddleware(), handlers.GetUserStatus)
	}

	// auth 模块
	auth := r.Group("/auth")
	{
		auth.POST("/login", handlers.Login)
		auth.POST("/register", handlers.Register)
	}

	// post 模块
	post := r.Group("/post").Use(middleware.AuthMiddleware())
	{
		post.GET("/posts", handlers.GetPosts)
		post.GET("/post-detail", handlers.GetPostDetail)
		post.GET("/forums", handlers.GetForums)
		post.GET("/forum-detail", handlers.GetForumDetail)
		post.GET("/follow-forum", handlers.GetFollowedForums)
		post.POST("/check-like", handlers.CheckLikeStatus) // 重新添加路由，使用 POST
		post.POST("/create", handlers.CreatePost)
		post.POST("/comment", handlers.CreateComment)
		post.POST("/reply", handlers.CreateReply)
		post.POST("/follow-forum", handlers.FollowForum)
		post.POST("/favorite-post", handlers.FavoritePost)
		post.POST("/like-post", handlers.LikePost)
		post.POST("/like-comment", handlers.LikeComment)
		post.POST("/create-forum", handlers.CreateForum)
		post.POST("/delete", handlers.DeleteContent) // 添加删除接口
	}

	// user 模块
	user := r.Group("/user").Use(middleware.AuthMiddleware())
	{
		user.GET("/user-profile", handlers.GetUserProfile)
		user.POST("/update-avatar", handlers.UpdateUserAvatar)
	}
}
