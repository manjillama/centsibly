import { getServerSession } from "next-auth";
import { options } from "../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import catchAsync from "@/utils/errorHandler";
import AppError from "@/utils/appError";
import { StatusCodes } from "http-status-codes";
import currencyService from "@/services/currencyService";

export const GET = catchAsync(async () => {
  const session = await getServerSession(options);
  if (!session) throw new AppError("Sign in first", StatusCodes.FORBIDDEN);
  await dbConnect();
  return Response.json({ status: "success", data: await currencyService.getCurrency(session.user.id as string) });
});
export const POST = catchAsync(async (req) => {
  const session = await getServerSession(options);
  if (!session) throw new AppError("Sign in first", StatusCodes.FORBIDDEN);
  await dbConnect();
  const body = await req.json();
  return Response.json({ status: "success", data: await currencyService.selectCurrency(session.user.id as string, body?.currency) });
});
