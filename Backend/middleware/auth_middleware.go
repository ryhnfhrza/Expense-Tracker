package middleware

import (
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/ryhnfhrza/Expense-Tracker/exception"
	"github.com/ryhnfhrza/Expense-Tracker/helper"
	"github.com/ryhnfhrza/Expense-Tracker/util"
)

func AuthMiddleware(next httprouter.Handle) httprouter.Handle {
	return func(writer http.ResponseWriter, request *http.Request, params httprouter.Params) {
		defer func() {
			if r := recover(); r != nil {
				exception.ErrorHandler(writer, request, r)
			}
		}()

		authHeader := request.Header.Get("Authorization")
		if authHeader == "" {
			panic(exception.NewUnauthorizedError("missing Authorization header"))
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			panic(exception.NewUnauthorizedError("invalid token format"))
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		claims, err := util.ValidateToken(tokenString)
		if err != nil {
			panic(exception.NewUnauthorizedError("invalid or expired token"))
		}

		ctx := helper.ContextWithUserID(request.Context(), claims.UserId)
		request = request.WithContext(ctx)

		next(writer, request, params)
	}
}
