import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateCompanyDto {
  @IsUrl({ require_protocol: true })
  careersUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
