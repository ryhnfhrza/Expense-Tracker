package app

import (
	"github.com/julienschmidt/httprouter"
	"github.com/ryhnfhrza/Expense-Tracker/controller"
	"github.com/ryhnfhrza/Expense-Tracker/middleware"
)

func NewRouter(userController controller.UserController, categoryController controller.CategoryController, expenseController controller.ExpenseController) *httprouter.Router {
	router := httprouter.New()

	router.POST("/api/register", userController.Register)
	router.POST("/api/login", userController.Login)
	router.POST("/api/verify-email", userController.VerifyEmail)

	router.POST("/api/category", middleware.AuthMiddleware(categoryController.CreateCategory))
	router.DELETE("/api/category/:categoryId", middleware.AuthMiddleware(categoryController.DeleteCategory))
	router.GET("/api/category/:categoryId", middleware.AuthMiddleware(categoryController.FindCategoryById))
	router.GET("/api/category", middleware.AuthMiddleware(categoryController.FindAllCategory))

	router.POST("/api/expense", middleware.AuthMiddleware(expenseController.CreateExpense))
	router.PUT("/api/expense/:expenseId", middleware.AuthMiddleware(expenseController.UpdateExpense))
	router.DELETE("/api/expense/:expenseId", middleware.AuthMiddleware(expenseController.DeleteExpense))
	router.GET("/api/expense/:expenseId", middleware.AuthMiddleware(expenseController.FindExpenseById))
	router.GET("/api/expense", middleware.AuthMiddleware(expenseController.FindAllExpense))

	router.GET("/api/expenses/summary/details", middleware.AuthMiddleware(expenseController.GetSummeryDetails))

	return router
}
