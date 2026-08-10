import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class QueryDto {
  @IsString()
  repoId!: string;

  @IsString()
  @MinLength(3)
  question!: string;

  @IsInt()
  @Min(5)
  @Max(50)
  @IsOptional()
  matchCount?: number;
}
