import Nat "mo:base/Nat";

module {
   public type Stats = {
       var current_xp : Nat;
       var current_level : Nat;
       var total_plays : Nat;
   };

   public type StatsResponse = {
       current_xp : Nat;
       current_level : Nat;
       total_plays : Nat;
       xp_to_next_level : Nat;
       total_xp_current_level : Nat;
       current_level_xp : Nat; 
       current_level_progress : Nat;
   };

   private let UPLOAD_XP = 100;
   private let PLAY_XP = 10;

   public class Leveling(stats : Stats) {
       private func totalXPForLevel(level : Nat) : Nat {
           if (level == 0) return 0;
           // 100 base XP + increasing amounts per level
           100 * level + (50 * (level - 1) * level) / 2
       };

       private func calculateLevel(xp : Nat) : Nat {
           var level = 0;
           while (xp >= totalXPForLevel(level + 1)) {
               level += 1;
           };
           level
       };

       private func getLevelProgress() : Nat {
           let currentLevelXP = totalXPForLevel(stats.current_level);
           let nextLevelXP = totalXPForLevel(stats.current_level + 1);
           let levelXP: Nat = stats.current_xp - currentLevelXP;
           let levelSize: Nat = nextLevelXP - currentLevelXP;
           (levelXP * 100) / levelSize
       };

       private func getRemainingXP() : Nat {
           let nextLevelTotal = totalXPForLevel(stats.current_level + 1);
           if (stats.current_xp >= nextLevelTotal) return 0;
           nextLevelTotal - stats.current_xp
       };

       public func addXP(amount : Nat) {
           stats.current_xp += amount;
           stats.current_level := calculateLevel(stats.current_xp);
       };

       public func awardUploadXP() {
           addXP(UPLOAD_XP);
       };

       public func awardPlayXP() {
           stats.total_plays += 1;
           addXP(PLAY_XP);
       };

       private func getCurrentLevelXP() : Nat {
    let currentLevelThreshold = totalXPForLevel(stats.current_level);
    stats.current_xp - currentLevelThreshold
};

       public func getStats() : StatsResponse {
           {
               current_xp = stats.current_xp;
               current_level = stats.current_level;
               total_plays = stats.total_plays;
               xp_to_next_level = getRemainingXP();
               total_xp_current_level = totalXPForLevel(stats.current_level + 1);
               current_level_xp = getCurrentLevelXP();
               current_level_progress = getLevelProgress();
           }
       };
   };
};