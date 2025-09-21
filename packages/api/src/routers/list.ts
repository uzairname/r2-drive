import { Result, safeAsync } from "@r2-drive/utils/result";
import { publicProcedure } from "../trpc";
import { _listObjectsWithPrefix, listDisplayableItemsInFolder } from "../services/r2";
import z from "zod";
import { Paths, PathSchema } from "@r2-drive/utils/path";
import { UIR2Item } from "@r2-drive/utils/types/item";


export const list = publicProcedure
  .input(z.object({ folder: PathSchema }))
  .query(({ ctx: { env }, input: { folder } }) => 
    listDisplayableItemsInFolder(env, folder))
  