import { User } from "../../models/user";

export interface IUserReply {
  user: User;
}

export interface IUserBody {
  user: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  };
}

export interface IUserEmail {
  user: {
    email: string;
    password: string;
  };
}

export interface IUserVerify {
  user: {
    email: string;
    confirmationCode: string;
  };
}
export interface ITokenBody {
  token: string;
}


export interface IUserForgotPassword {
  user: {
    email: string;
  };
}

export interface IUserConfirmForgotPassword {
  user: {
    email: string;
    code: string;
    password: string;
  };
}
export interface IUserResendConfirmationCode {
  user: {
    email: string;
  };
}
