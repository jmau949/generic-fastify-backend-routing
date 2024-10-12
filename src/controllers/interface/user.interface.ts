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
export interface ITokenBody {
  token: string;
}
