import Text "mo:base/Text";
import Array "mo:base/Array";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Char "mo:base/Char";
import Nat32 "mo:base/Nat32";
import Hash "mo:base/Hash";

module {

    public type Session = {
        id : Nat;
        day : Text; // "mercredi", "jeudi", "vendredi"
        time : Text; // "14:15", "16:00", etc.
        isEnabled : Bool;
    };

    public type UserInfo = {
        name : Text;
        phone : Text;
    };

    public type Booking = {
        sessionId : Nat;
        user : UserInfo;
    };

    public type State = {
        var sessions : [(Nat, Session)];
        var nextId : Nat;
    };

    public func init() : State = {
        var sessions = [];
        var nextId = 0;
    };

    public class BookingSystem(state : State) {
        private var sessions = HashMap.fromIter<Nat, Session>(
            state.sessions.vals(),
            state.sessions.size(),
            Nat.equal,
            func(n : Nat) : Hash.Hash { Nat32.fromNat(n) },
        );
        private var bookings = HashMap.HashMap<Nat, Booking>(0, Nat.equal, func(n : Nat) : Hash.Hash { Nat32.fromNat(n) });
        private var nextId = state.nextId;

        // Helper Function for time comparison
        private func timeToMinutes(time : Text) : Int {
            let parts = Text.split(time, #char ':');
            let partsArray = Iter.toArray(parts);
            if (partsArray.size() == 2) {
                let hours = textToNat(partsArray[0]);
                let minutes = textToNat(partsArray[1]);
                (hours * 60) + minutes;
            } else {
                0;
            };
        };

        private func textToNat(text : Text) : Int {
            var num = 0;
            for (c in text.chars()) {
                let digit = Nat32.toNat(Char.toNat32(c) - 48);
                if (digit >= 0 and digit <= 9) {
                    num := num * 10 + digit;
                };
            };
            num;
        };

        // Session Management
        public func addSession(day : Text, time : Text) : Nat {
            let id = nextId;
            nextId += 1;

            let session : Session = {
                id = id;
                day = day;
                time = time;
                isEnabled = true;
            };

            sessions.put(id, session);
            state.sessions := Iter.toArray(sessions.entries());
            state.nextId := nextId;
            id;
        };

        public func removeSession(id : Nat) : Bool {
            switch (sessions.remove(id)) {
                case (null) { false };
                case (?_) {
                    state.sessions := Iter.toArray(sessions.entries());
                    true;
                };
            };
        };

        private func getDayOrder(day : Text) : Nat {
            switch (day) {
                case "lundi" { 0 };
                case "mardi" { 1 };
                case "mercredi" { 2 };
                case "jeudi" { 3 };
                case "vendredi" { 4 };
                case "samedi" { 5 };
                case "dimanche" { 6 };
                case _ { 999 }; // Unknown days go at the end
            };
        };

        // Get all sessions organized by day and sorted by time
        public func getSessionsByDay() : [(Text, [Session])] {
            // Get unique days using a HashMap for deduplication
            let uniqueDaysMap = HashMap.HashMap<Text, Bool>(0, Text.equal, Text.hash);
            for (session in sessions.vals()) {
                uniqueDaysMap.put(session.day, true);
            };

            let uniqueDays = Iter.toArray(uniqueDaysMap.keys());
            let sortedDays = Array.sort<Text>(
                uniqueDays,
                func(a, b) {
                    Int.compare(getDayOrder(a), getDayOrder(b));
                },
            );

            // Group sessions by these days
            let groupedSessions = Array.map<Text, (Text, [Session])>(
                sortedDays,
                func(day : Text) : (Text, [Session]) {
                    let daySessions = Array.filter<Session>(
                        Iter.toArray(sessions.vals()),
                        func(s) { s.day == day },
                    );

                    // Sort sessions by time
                    let sortedSessions = Array.sort<Session>(
                        daySessions,
                        func(a, b) {
                            Int.compare(
                                timeToMinutes(a.time),
                                timeToMinutes(b.time),
                            );
                        },
                    );

                    (day, sortedSessions);
                },
            );

            // Return only days that have sessions
            Array.filter<(Text, [Session])>(
                groupedSessions,
                func((_, sessions)) { sessions.size() > 0 },
            );
        };
        // Booking Management
        public func makeBooking(sessionId : Nat, user : UserInfo) : Bool {
            // Check if user already has a booking
            let existingBooking = Array.find<(Nat, Booking)>(
                Iter.toArray(bookings.entries()),
                func((_, b)) { b.user.phone == user.phone },
            );

            switch (existingBooking) {
                case (?_) { false }; // User already has a booking
                case null {
                    // Check if session exists and is enabled
                    switch (sessions.get(sessionId)) {
                        case (?s) {
                            if (not s.isEnabled) { return false };
                            // Check if session is already booked
                            switch (bookings.get(sessionId)) {
                                case (?_) { false }; // Session already booked
                                case null {
                                    let booking : Booking = {
                                        sessionId = sessionId;
                                        user = user;
                                    };
                                    bookings.put(sessionId, booking);
                                    true;
                                };
                            };
                        };
                        case null { false };
                    };
                };
            };
        };

        public func cancelBooking(phone : Text) : Bool {
            let booking = Array.find<(Nat, Booking)>(
                Iter.toArray(bookings.entries()),
                func((_, b)) { b.user.phone == phone },
            );

            switch (booking) {
                case (?(id, _)) {
                    bookings.delete(id);
                    true;
                };
                case null { false };
            };
        };

        // Get user's current booking with session details
        public func getUserBooking(phone : Text) : ?(Booking, Session) {
            let booking = Array.find<(Nat, Booking)>(
                Iter.toArray(bookings.entries()),
                func((_, b)) { b.user.phone == phone },
            );

            switch (booking) {
                case (?(_, b)) {
                    switch (sessions.get(b.sessionId)) {
                        case (?s) { ?(b, s) };
                        case null { null };
                    };
                };
                case null { null };
            };
        };

        // Check if a session is booked
        public func isSessionBooked(sessionId : Nat) : Bool {
            switch (bookings.get(sessionId)) {
                case (?_) { true };
                case null { false };
            };
        };

        // Reset all bookings
        public func resetAllBookings() {
            bookings := HashMap.HashMap<Nat, Booking>(0, Nat.equal, func(n : Nat) : Hash.Hash { Nat32.fromNat(n) });
        };

         public func getSessionBooking(sessionId : Nat) : ?Booking {
            bookings.get(sessionId)
        };
    };

};
