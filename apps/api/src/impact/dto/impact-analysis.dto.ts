import { IsString, MinLength } from "class-validator";

export class ImpactAnalysisDto {
  @IsString()
  repoId!: string;

  @IsString()
  @MinLength(10, { message: "diff must be a non-trivial unified diff" })
  diff!: string;
}
