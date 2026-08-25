import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getRank(correct, accuracy, points) {
  if (
    correct >= 500 &&
    accuracy >= 75 &&
    points >= 5000
  ) {
    return {
      level: 7,
      name: "Maç Kahini",
      icon: "🔮",
    };
  }

  if (
    correct >= 200 &&
    accuracy >= 70 &&
    points >= 2500
  ) {
    return {
      level: 6,
      name: "Tahminci",
      icon: "👑",
    };
  }

  if (
    correct >= 100 &&
    accuracy >= 60 &&
    points >= 1200
  ) {
    return {
      level: 5,
      name: "Uzman",
      icon: "🧠",
    };
  }

  if (
    correct >= 50 &&
    accuracy >= 50 &&
    points >= 500
  ) {
    return {
      level: 4,
      name: "Usta",
      icon: "🎯",
    };
  }

  if (
    correct >= 25 &&
    accuracy >= 40 &&
    points >= 250
  ) {
    return {
      level: 3,
      name: "İddialı",
      icon: "🔥",
    };
  }

  if (
    correct >= 10 &&
    accuracy >= 30 &&
    points >= 100
  ) {
    return {
      level: 2,
      name: "Amatör",
      icon: "⚽",
    };
  }

  return {
    level: 1,
    name: "Çaylak",
    icon: "🌱",
  };
}

function getPeriodStart(period) {
  const now = new Date();

  if (period === "daily") {
    const date = new Date(now);

    date.setHours(
      0,
      0,
      0,
      0
    );

    return date;
  }

  if (period === "weekly") {
    const date = new Date(now);

    const day = date.getDay();

    const diff =
      day === 0
        ? 6
        : day - 1;

    date.setDate(
      date.getDate() - diff
    );

    date.setHours(
      0,
      0,
      0,
      0
    );

    return date;
  }

  if (period === "monthly") {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
  }

  return null;
}

export async function GET(request) {
  try {
    const supabase = getSupabase();

    const { searchParams } =
      new URL(request.url);

    const requestedPeriod =
      searchParams.get("period") ||
      "daily";

    const period = [
      "daily",
      "weekly",
      "monthly",
      "all",
    ].includes(requestedPeriod)
      ? requestedPeriod
      : "daily";

    const requestedUserId =
      searchParams.get("user_id");

    let query = supabase
      .from("predictions")
      .select(
        `
          id,
          user_id,
          result,
          points,
          created_at,
          users (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    const periodStart =
      getPeriodStart(period);

    if (periodStart) {
      query = query.gte(
        "created_at",
        periodStart.toISOString()
      );
    }

    const {
      data: predictions,
      error,
    } = await query;

    if (error) {
      console.error(
        "Leaderboard predictions error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const users = new Map();

    for (const prediction of predictions || []) {
      const userId =
        prediction.user_id;

      if (!userId) {
        continue;
      }

      if (!users.has(userId)) {
        const user =
          prediction.users || {};

        users.set(userId, {
          id: userId,

          username:
            user.username || null,

          first_name:
            user.first_name || null,

          last_name:
            user.last_name || null,

          avatar_url:
            user.avatar_url || null,

          predictions: 0,
          decided: 0,
          correct: 0,
          points: 0,
        });
      }

      const stats =
        users.get(userId);

      stats.predictions += 1;

      const result = String(
        prediction.result || ""
      )
        .trim()
        .toLowerCase();

      const isCorrect = [
        "correct",
        "won",
        "win",
        "success",
        "successful",
        "doğru",
        "dogru",
        "kazandı",
        "kazandi",
      ].includes(result);

      const isWrong = [
        "wrong",
        "lost",
        "lose",
        "failed",
        "failure",
        "yanlış",
        "yanlis",
        "kaybetti",
        "kaybetti",
      ].includes(result);

      if (isCorrect || isWrong) {
        stats.decided += 1;
      }

      if (isCorrect) {
        stats.correct += 1;
      }

      const points =
        Number(prediction.points);

      if (Number.isFinite(points)) {
        stats.points += points;
      }
    }

    const leaderboard =
      Array.from(users.values())
        .map((user) => {
          const accuracy =
            user.decided > 0
              ? Math.round(
                  (user.correct /
                    user.decided) *
                    100
                )
              : 0;

          const rank = getRank(
            user.correct,
            accuracy,
            user.points
          );

          return {
            id: user.id,

            username:
              user.username,

            first_name:
              user.first_name,

            last_name:
              user.last_name,

            avatar_url:
              user.avatar_url,

            predictions:
              user.predictions,

            decided:
              user.decided,

            correct:
              user.correct,

            accuracy,

            points:
              user.points,

            rank,
          };
        })
        .filter(
          (user) =>
            user.predictions > 0
        )
        .sort((a, b) => {
          if (
            b.points !==
            a.points
          ) {
            return (
              b.points -
              a.points
            );
          }

          if (
            b.correct !==
            a.correct
          ) {
            return (
              b.correct -
              a.correct
            );
          }

          if (
            b.accuracy !==
            a.accuracy
          ) {
            return (
              b.accuracy -
              a.accuracy
            );
          }

          return (
            b.predictions -
            a.predictions
          );
        })
        .map(
          (user, index) => ({
            ...user,
            position:
              index + 1,
          })
        );

    let currentUser = null;

    if (requestedUserId) {
      currentUser =
        leaderboard.find(
          (user) =>
            user.id ===
            requestedUserId
        ) || null;
    }

    return NextResponse.json({
      success: true,
      period,
      count:
        leaderboard.length,
      leaderboard,
      current_user:
        currentUser,
    });
  } catch (error) {
    console.error(
      "Leaderboard server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Liderlik verileri alınırken bir sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}