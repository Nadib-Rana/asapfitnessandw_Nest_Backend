import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/context/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
}
