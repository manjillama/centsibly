import dbConnect from "@/lib/dbConnect";
import catchAsync from "@/utils/errorHandler";
import { getServerSession } from "next-auth";
import { options } from "../../auth/[...nextauth]/options";
import AppError from "@/utils/appError";
import { StatusCodes } from "http-status-codes";
import transactionService from "@/services/transactionService";

export const PUT = catchAsync(async function (
  req: Request,
  { params: { id } }: { params: { id: string } }
) {
  await dbConnect();
  const session = await getServerSession(options);

  if (!session)
    throw new AppError("You need to be logged first", StatusCodes.FORBIDDEN);

  const body = await req.json();

  const transaction = await transactionService.updateTransaction(
    id,
    body,
    session.user.id as string
  );

  return Response.json({
    status: "success",
    data: transaction,
  });
});

export const DELETE = catchAsync(async (req, { params }: { params: { id: string } }) => {
  const session = await getServerSession(options);
  if (!session) throw new AppError("You need to be logged in first", StatusCodes.FORBIDDEN);
  await dbConnect();
  await transactionService.deleteTransaction(params.id, session.user.id as string);
  return Response.json({ status: "success", data: null });
});
