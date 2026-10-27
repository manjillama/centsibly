import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import dbConnect from "@/lib/dbConnect";
import catchAsync from "@/utils/errorHandler";
import AppError from "@/utils/appError";
import budgetService from "@/services/budgetService";
import { StatusCodes } from "http-status-codes";

export const PUT = catchAsync(async (req, { params }: { params: { id: string } }) => {
  const session = await getServerSession(options);
  if (!session) throw new AppError("You need to be logged in first", StatusCodes.FORBIDDEN);
  await dbConnect();
  const body = await req.json();
  return Response.json({ status: "success", data: await budgetService.renameBudget(params.id, body?.name, session.user.id as string) });
});

export const PATCH = catchAsync(async (req, { params }: { params: { id: string } }) => {
  const session = await getServerSession(options);
  if (!session) throw new AppError("You need to be logged in first", StatusCodes.FORBIDDEN);
  await dbConnect();
  const body = await req.json();
  return Response.json({ status: "success", data: body && Object.prototype.hasOwnProperty.call(body, "archived")
    ? await budgetService.setBudgetArchived(params.id, body.archived, session.user.id as string)
    : await budgetService.setBudgetTarget(params.id, body?.target, session.user.id as string) });
});
