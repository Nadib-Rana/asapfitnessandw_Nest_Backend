import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { LmsService } from "./lms.service";
import { ListClassesQueryDto } from "./dto/list-classes-query.dto";
import { ResponseMessage } from "../common/decorators/response-message.decorator";

@Controller("lms")
@UseGuards(JwtAuthGuard)
export class LmsController {
  constructor(private readonly lmsService: LmsService) {}

  @Get("categories")
  @ResponseMessage("Accessible categories fetched successfully")
  getCategories(@GetUser("userId") userId: string) {
    return this.lmsService.listAccessibleCategories(userId);
  }

  @Get("classes")
  @ResponseMessage("Category classes fetched successfully")
  getCategoryClasses(
    @GetUser("userId") userId: string,
    @Query() query: ListClassesQueryDto,
  ) {
    return this.lmsService.listCategoryClasses(userId, query.categoryId);
  }
}
