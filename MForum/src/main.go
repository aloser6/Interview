package main

import (
	"mforum/config"
	"mforum/models"
	"mforum/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	// 初始化数据库
	models.InitDB()

	// 创建 Gin 引擎
	r := gin.Default()

	// 设置路由
	routes.SetupRoutes(r)

	// 启动服务器
	r.Run(config.AppConfig.Port) // 默认 ":8080"
}
