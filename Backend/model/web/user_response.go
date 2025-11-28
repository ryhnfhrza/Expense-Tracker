package web

type UserResponse struct {
	Username string `json:"username"`
	Email    string `json:"email"`
}

type UserLoginResponse struct {
	Id       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Token    string `json:"token"`
}
