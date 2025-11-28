package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-playground/validator/v10"
	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"github.com/ryhnfhrza/Expense-Tracker/app"
	"github.com/ryhnfhrza/Expense-Tracker/controller"
	"github.com/ryhnfhrza/Expense-Tracker/exception"
	"github.com/ryhnfhrza/Expense-Tracker/helper"
	"github.com/ryhnfhrza/Expense-Tracker/repository"
	"github.com/ryhnfhrza/Expense-Tracker/service"
	"github.com/ryhnfhrza/Expense-Tracker/util"
)

func main() {
	envPath := filepath.Join("..", ".env")

	if p := os.Getenv("CONFIG_PATH"); p != "" {
		envPath = p
	}

	if err := godotenv.Load(envPath); err != nil {
		log.Printf("Warning: gagal memuat %s: %v", envPath, err)
	}

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "3000"
	}

	redisClient := app.NewRedis()
	defer func() {
		if err := redisClient.Close(); err != nil {
			fmt.Println("Error closing Redis connection:", err)
		}
	}()

	DB := app.NewDB()

	validate := validator.New()
	util.RegisterValidations(validate)

	userRepository := repository.NewUserRepository()
	userRedisRepository := repository.NewUserRedisRepository(redisClient)
	userService := service.NewUserService(userRepository, userRedisRepository, validate, DB)
	userController := controller.NewUserController(userService)

	catogoryRepository := repository.NewCategoryRepository()
	categoryService := service.NewCategoryService(DB, validate, catogoryRepository)
	categoryController := controller.NewCategoryController(categoryService)

	expenseSummeryRepository := repository.NewExpenseSummeryRepository()

	expenseRepository := repository.NewExpenseRepository()
	expenseService := service.NewExpenseService(DB, validate, expenseRepository, catogoryRepository, expenseSummeryRepository)
	expenseController := controller.NewExpenseController(expenseService)

	router := app.NewRouter(userController, categoryController, expenseController)

	router.PanicHandler = exception.ErrorHandler

	server := http.Server{
		Addr:    ":" + port,
		Handler: app.CORS(router),
	}

	log.Printf("Server running on port %s", port)
	err := server.ListenAndServe()
	helper.PanicIfError(err)

}
