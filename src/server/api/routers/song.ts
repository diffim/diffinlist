import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isImage } from "~/server/helpers/ImageChecker";
import { songValidate } from "~/server/helpers/zodTypes";
import { createTRPCRouter, publicProcedure, withAuthProcedure } from "../trpc";

export const songRouter = createTRPCRouter({
  /* QUERIES */
  //gets the song for Song.tsx
  getSong: publicProcedure
    .input(
      z.object({
        profileName: z.string(),
        playlistName: z.string(),
        songName: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const song = await ctx.prisma.song.findUnique({
        where: {
          name_authorName_playlistName: {
            authorName: input.profileName,
            name: input.songName,
            playlistName: input.playlistName,
          },
        },
      });

      return song;
    }),

  // //when fetching for [playlist] it gets it with playlistname and profilename
  // //when fetching for [profileName] it gets it with profilename
  // //the distinct is because u can add other ppls playlist to ur own, or copy a song from one playlist to another
  // // this creates duplicate playlists just witha different playlistname/authorname which ruins the ui.
  // getSongs: publicProcedure
  //   .input(
  //     z.object({
  //       profileName: z.string(),
  //       playlistName: z.string().optional(),
  //       takeLimit: z.number(),
  //     })
  //   )
  //   .query(async ({ ctx, input }) => {
  //     const songs = await ctx.prisma.song.findMany({
  //       where: {
  //         authorName: input.profileName,
  //         playlistName: input.playlistName,
  //       },
  //       orderBy: [{ createdAt: "desc" }],
  //       take: input.takeLimit,
  //     });

  //     return songs;
  //   }),

  getSongsByPlaylist: publicProcedure
    .input(
      z.object({
        profileName: z.string(),
        playlistName: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const songs = await ctx.prisma.song.findMany({
        where: {
          playlists: {
            every: {
              name: input.playlistName,
            },
          },
        },
      });

      return songs;
    }),

  getAllSongs: publicProcedure.query(async ({ ctx }) => {
    const songs = await ctx.prisma.song.findMany({
      take: 8,
      orderBy: [{ createdAt: "desc" }],
    });

    return songs;
  }),

  /* MUTATIONS */
  createSong: withAuthProcedure
    .input(songValidate)
    .mutation(async ({ ctx, input }) => {
      const isImageValid = isImage(input.pictureUrl);

      if (isImageValid === false) {
        throw new TRPCError({
          code: "PARSE_ERROR",
          message: "Please make sure your URL is a picture URL.",
        });
      }

      await ctx.prisma.song.create({
        data: {
          name: input.name,
          pictureUrl: input.pictureUrl,
          songUrl: input.songUrl,
          genre: input.genre,
          playlistName: input.playlistName,
          authorName: ctx.username,

          album: input.albumName,
          artist: input.artistName,
          description: input.description,
          rating: input.rating,

          playlists: {
            connect: {
              name_authorName: {
                name: input.playlistName,
                authorName: ctx.username,
              },
            },
          },
        },
      });
    }),

  deleteSong: withAuthProcedure
    .input(
      z.object({
        name: z.string().min(1),
        playlistName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.song.delete({
        where: {
          name_authorName_playlistName: {
            authorName: ctx.username,
            name: input.name,
            playlistName: input.playlistName,
          },
        },
      });
    }),

  //newValeus are the values to be udpated, the rest are the old values which are needed to see which song we should upate.
  //takes the songValidate function and removes the playlistname as a changable factor as that needs to be unchanged.
  updateSong: withAuthProcedure
    .input(
      z.object({
        newValues: songValidate
          .omit({
            playlistName: true,
          })
          .partial(),
        currentSongName: z.string().min(1),
        currentPlaylistName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isImageValid = isImage(
        input.newValues.pictureUrl ? input.newValues.pictureUrl : ""
      );

      if (isImageValid === false) {
        throw new TRPCError({
          code: "PARSE_ERROR",
          message: "Please make sure your URL is a picture URL.",
        });
      }

      await ctx.prisma.song.update({
        where: {
          name_authorName_playlistName: {
            name: input.currentSongName,
            authorName: ctx.username,
            playlistName: input.currentPlaylistName,
          },
        },

        data: {
          name: input.newValues.name,
          pictureUrl: input.newValues.pictureUrl,
          songUrl: input.newValues.songUrl,
          genre: input.newValues.genre,

          album: input.newValues.albumName,
          artist: input.newValues.artistName,
          description: input.newValues.description,
          rating: input.newValues.rating,
        },
      });
    }),
});
