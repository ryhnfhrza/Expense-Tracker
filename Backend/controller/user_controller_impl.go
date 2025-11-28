package controller

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/ryhnfhrza/Expense-Tracker/helper"
	"github.com/ryhnfhrza/Expense-Tracker/model/web"
	"github.com/ryhnfhrza/Expense-Tracker/service"
)

type userControllerImpl struct {
	UserService service.UserService
}

func NewUserController(userService service.UserService) UserController {
	return &userControllerImpl{
		UserService: userService,
	}
}

func (controller *userControllerImpl) Register(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	userRequest := web.UserRequest{}
	helper.ReadFromRequestBody(request, &userRequest)

	userResponse := controller.UserService.Register(request.Context(), userRequest)

	webResponse := web.WebResponse{
		Code:   http.StatusCreated,
		Status: "Created",
		Data:   userResponse,
	}

	helper.WriteToResponseBody(writer, webResponse)
}

func (controller *userControllerImpl) VerifyEmail(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	userRequest := web.UserVerifyRequest{}
	helper.ReadFromRequestBody(request, &userRequest)

	userResponse := controller.UserService.VerifyEmail(request.Context(), userRequest.Email, userRequest.Code)

	webResponse := web.WebResponse{
		Code:   http.StatusOK,
		Status: "OK",
		Data:   userResponse,
	}

	helper.WriteToResponseBody(writer, webResponse)
}

func (controller *userControllerImpl) Login(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
	userRequest := web.UserLoginRequest{}
	helper.ReadFromRequestBody(request, &userRequest)

	userResponse, err := controller.UserService.Login(request.Context(), userRequest)
	helper.PanicIfError(err)

	webResponse := web.WebResponse{
		Code:   http.StatusOK,
		Status: "OK",
		Data:   userResponse,
	}

	helper.WriteToResponseBody(writer, webResponse)
}
