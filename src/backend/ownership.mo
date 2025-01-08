import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Debug "mo:base/Debug";

module {
    type IC = actor {
        update_settings : {
            canister_id : Principal;
            settings : {
                controllers : ?[Principal];
                compute_allocation : ?Nat;
                memory_allocation : ?Nat;
                freezing_threshold : ?Nat;
            };
        } -> async ();
        canister_status : { canister_id : Principal } -> async {
            status : { #running; #stopping; #stopped };
            settings : {
                controllers : [Principal];
                compute_allocation : Nat;
                memory_allocation : Nat;
                freezing_threshold : Nat;
            };
            memory_size : Nat;
            cycles : Nat;
            module_hash : ?[Nat8];
        };
    };

    public type State = {
        var controllers : [Principal];
        var self : Principal;
        var owner: Principal;
    };

    public func init(creator : Principal) : State = {
        var controllers = [creator];
        var self = Principal.fromText("aaaaa-aa"); // init with a valid principal but that is not self
        var owner = Principal.fromText("2vxsx-fae");
    };

    public class Code(state : State) {
       
        private let ic : IC = actor "aaaaa-aa";
        private let ANONYMOUS_PRINCIPAL = Principal.fromText("2vxsx-fae");

        public func setSelf(id : Principal) : () {
            state.self := id;
        };

        private func update_controllers() : async () {
            let status = await ic.canister_status({ canister_id = state.self });
            state.controllers := status.settings.controllers;
        };

        public func add_controller(caller : Principal, new_controller : Principal) : async () {
            assert(Option.isSome(Array.find<Principal>(state.controllers, func(p) { p == caller })));
            
            let status = await ic.canister_status({ canister_id = state.self });
            let current_controllers = status.settings.controllers;

            if (Option.isNull(Array.find<Principal>(current_controllers, func(p) { p == new_controller }))) {
                await ic.update_settings({
                    canister_id = state.self;
                    settings = {
                        controllers = ?Array.append(current_controllers, [new_controller]);
                        compute_allocation = null;
                        memory_allocation = null;
                        freezing_threshold = null;
                    }
                });
                await update_controllers();
            };
        };

        public func remove_self_controller_and_drop_ownership(caller : Principal) : async () {
            assert(Option.isSome(Array.find<Principal>(state.controllers, func(p) { p == caller })));
            
            let status = await ic.canister_status({ canister_id = state.self });
            let current_controllers = status.settings.controllers;

            assert(current_controllers.size() > 1);

            if (caller == state.owner) {
                state.owner := ANONYMOUS_PRINCIPAL;
            };
            
            await ic.update_settings({
                canister_id = state.self;
                settings = {
                    controllers = ?Array.filter<Principal>(current_controllers, func(p) { p != caller });
                    compute_allocation = null;
                    memory_allocation = null;
                    freezing_threshold = null;
                }
            });
            await update_controllers();
        };

        public func is_controller(principal : Principal) : Bool {
            // Debug.print(Principal.toText(principal));
            Option.isSome(Array.find<Principal>(state.controllers, func(p) { p == principal }))
        };

        public func claim_ownership(caller : Principal) : async Bool {
            assert(is_controller(caller));
            assert(state.owner == ANONYMOUS_PRINCIPAL);
            state.owner := caller;
            return true;
        };

        // public func drop_ownership(caller : Principal) : async () {
        //     assert(caller == state.owner);
        //     state.owner := ANONYMOUS_PRINCIPAL;
        // };

        
    }
}