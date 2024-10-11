import { IsEmail, Length } from "class-validator";

export class User {
  @IsEmail(undefined, { message: "Invalid email format" })
  email: string;

  @Length(8, 100, { message: "Password must be at least 8 characters long" })
  password: string;

  @Length(1, 100, { message: "Name must be between 1 and 100 characters" })
  firstName: string;

  @Length(1, 100, { message: "Name must be between 1 and 100 characters" })
  lastName: string;

  constructor(email: string, password: string, firstName: string, lastName: string) {
    this.email = email;
    this.password = password;
    this.firstName = firstName;
    this.lastName = lastName;
  }
}
