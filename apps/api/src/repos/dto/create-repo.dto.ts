import { IsOptional, IsString, IsUrl, Length } from "class-validator";

export class CreateRepoDto {
  @IsUrl({ protocols: ["https"], require_protocol: true })
  githubUrl!: string;

  @IsString()
  @Length(1, 200)
  @IsOptional()
  defaultBranch?: string;
}
