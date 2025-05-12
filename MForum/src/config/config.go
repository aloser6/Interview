package config

type Config struct {
	Port     string
	DBConfig DBConfig
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
}

var AppConfig = Config{
	Port: ":8080",
	DBConfig: DBConfig{
		Host:     "localhost",
		Port:     "3306",
		User:     "root",
		Password: "123456", // 替换为你的实际密码
		DBName:   "mforum",
	},
}
