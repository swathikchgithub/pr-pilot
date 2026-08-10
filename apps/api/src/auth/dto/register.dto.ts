import { IsEmail, IsString, Length, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10, { message: "password must be at least 10 characters" })
  password!: string;

  @IsString()
  @Length(2, 100)
  orgName!: string;
}
