package web

type CategoryRequest struct {
	Name   string `json:"name" validate:"required"`
	UserId int    `json:"user_id" validate:"required,gt=0"`
}
