package controller

import (
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/ryhnfhrza/Expense-Tracker/helper"
	"github.com/ryhnfhrza/Expense-Tracker/model/web"
	"github.com/ryhnfhrza/Expense-Tracker/service"
)

type categoryControllerImpl struct {
	CategoryService service.CategoryService
}

func NewCategoryController(categoryService service.CategoryService) CategoryController {
	return &categoryControllerImpl{
		CategoryService: categoryService,
	}
}

func (categoryController *categoryControllerImpl) CreateCategory(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	categoryRequest := web.CategoryRequest{}
	helper.ReadFromRequestBody(request, &categoryRequest)

	userId, ok := helper.GetUserIDFromContext(request.Context())
	if !ok {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	categoryRequest.UserId = userId

	userResponse := categoryController.CategoryService.CreateCategory(request.Context(), &categoryRequest)

	webResponse := web.WebResponse{
		Code:   http.StatusCreated,
		Status: "Created",
		Data:   userResponse,
	}

	helper.WriteToResponseBody(writer, webResponse)
}

func (categoryController *categoryControllerImpl) DeleteCategory(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	categoryIdsString := params.ByName("categoryId")
	categoryId, err := strconv.Atoi(categoryIdsString)
	helper.PanicIfError(err)

	userId, ok := helper.GetUserIDFromContext(request.Context())
	if !ok {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	categoryController.CategoryService.DeleteCategory(request.Context(), categoryId, int(userId))

	webResponse := web.WebResponse{
		Code:   http.StatusNoContent,
		Status: "NO CONTENT",
	}

	helper.WriteToResponseBody(writer, webResponse)
}

func (categoryController *categoryControllerImpl) FindCategoryById(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	categoryIdsString := params.ByName("categoryId")
	categoryId, err := strconv.Atoi(categoryIdsString)
	helper.PanicIfError(err)

	userId, ok := helper.GetUserIDFromContext(request.Context())
	if !ok {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	category := categoryController.CategoryService.FindCategoryById(request.Context(), categoryId, int(userId))

	webResponse := web.WebResponse{
		Code:   http.StatusOK,
		Status: "OK",
		Data:   category,
	}

	helper.WriteToResponseBody(writer, webResponse)
}

func (categoryController *categoryControllerImpl) FindAllCategory(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	userId, ok := helper.GetUserIDFromContext(request.Context())
	if !ok {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	categories := categoryController.CategoryService.FindAllCategoryById(request.Context(), int(userId))

	webResponse := web.WebResponse{
		Code:   http.StatusOK,
		Status: "OK",
		Data:   categories,
	}

	helper.WriteToResponseBody(writer, webResponse)
}
