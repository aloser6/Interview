package models

import (
	"fmt"
	"mforum/config"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		config.AppConfig.DBConfig.User,
		config.AppConfig.DBConfig.Password,
		config.AppConfig.DBConfig.Host,
		config.AppConfig.DBConfig.Port,
		config.AppConfig.DBConfig.DBName,
	)
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("failed to connect database: " + err.Error())
	}

	// 自动迁移，确保类型一致
	// err = DB.AutoMigrate(
	// 	&Slide{},
	// 	&User{},
	// 	&Forum{},
	// 	&Post{},
	// 	&Comment{PostID: 0}, // 强制指定 PostID 为 INT UNSIGNED
	// 	&Favorite{},
	// 	&Like{},
	// 	&Follow{},
	// 	&CommentLike{},
	// )
	// if err != nil {
	// 	panic("failed to migrate database: " + err.Error())
	// }
}

type Comment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PostID    uint      `gorm:"not null" json:"postId"`
	Username  string    `gorm:"type:varchar(64);not null" json:"username"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	ParentID  uint      `gorm:"default:0" json:"parentId"`
	Likes     uint      `gorm:"default:0" json:"likes"`
	Comments  uint      `gorm:"default:0" json:"comments"`
	Favorites uint      `gorm:"default:0" json:"favorites"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	Replies   []Comment `gorm:"-" json:"replies,omitempty"`
	Avatar    string    `gorm:"-" json:"avatar,omitempty"`
}

type CommentLike struct {
	ID        uint   `gorm:"primaryKey"`
	CommentID uint   `gorm:"not null" json:"commentId"`
	Username  string `gorm:"type:varchar(64);not null" json:"username"`
}

type Favorite struct {
	ID       uint   `gorm:"primaryKey"`
	PostID   uint   `gorm:"not null" json:"postId"`
	Username string `gorm:"type:varchar(64);not null" json:"username"`
}

type Follow struct {
	ID       uint   `gorm:"primaryKey"`
	ForumID  uint   `gorm:"not null" json:"forumId"`
	Username string `gorm:"type:varchar(64);not null" json:"username"`
}

type Like struct {
	ID       uint   `gorm:"primaryKey"`
	PostID   uint   `gorm:"not null" json:"postId"`
	Username string `gorm:"type:varchar(64);not null" json:"username"`
}

type Post struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ForumName string    `gorm:"type:varchar(100);not null" json:"forumName"`
	Username  string    `gorm:"type:varchar(64);not null" json:"username"`
	Title     string    `gorm:"type:varchar(255);not null" json:"title"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	Likes     uint      `gorm:"default:0" json:"likes"`
	Comments  uint      `gorm:"default:0" json:"comments"`
	Favorites uint      `gorm:"default:0" json:"favorites"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	Images    string    `gorm:"type:text" json:"images"` // 添加 Images 字段
}

type Slide struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	ImageURL string `gorm:"type:varchar(255)" json:"imageUrl"`
}

type User struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    string    `gorm:"type:varchar(255);uniqueIndex" json:"userId"`
	Username  string    `gorm:"type:varchar(64);not null" json:"username"`
	Account   string    `gorm:"type:varchar(9);uniqueIndex;not null" json:"account"`
	Password  string    `gorm:"type:varchar(255);not null" json:"-"`
	Avatar    string    `gorm:"type:varchar(255);default:'/picture/default-user.png'" json:"avatar"` // 新增头像字段
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

type Forum struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Name        string `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Icon        string `gorm:"type:varchar(255);not null" json:"icon"`
	Description string `gorm:"type:text;not null" json:"description"`
	Creator     string `gorm:"type:varchar(64);not null" json:"creator"` // 新增创建者字段
}
