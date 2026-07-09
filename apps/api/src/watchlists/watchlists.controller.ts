import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CreateWatchlistDto } from "./dto/create-watchlist.dto";
import { UpdateWatchlistDto } from "./dto/update-watchlist.dto";
import { WatchlistsService } from "./watchlists.service";

@Controller("watchlists")
export class WatchlistsController {
  constructor(private readonly watchlistsService: WatchlistsService) {}

  @Get()
  listWatchlists(@Req() request: Request) {
    return this.watchlistsService.listWatchlists(request.user!.id);
  }

  @Post()
  addToWatchlist(@Req() request: Request, @Body() dto: CreateWatchlistDto) {
    return this.watchlistsService.addToWatchlist(request.user!.id, dto);
  }

  @Patch(":id")
  updateWatchlist(
    @Req() request: Request,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateWatchlistDto,
  ) {
    return this.watchlistsService.updateWatchlist(request.user!.id, id, dto);
  }

  @Delete(":id")
  removeFromWatchlist(
    @Req() request: Request,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.watchlistsService.removeFromWatchlist(request.user!.id, id);
  }
}
