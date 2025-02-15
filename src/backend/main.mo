import Server "mo:server";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Assets "mo:assets";
import T "mo:assets/Types";
import Cycles "mo:base/ExperimentalCycles";
import Array "mo:base/Array";
import Principal "mo:base/Principal";
import Routes "routes";
import fileStorage "file_storage";
import Blob "mo:base/Blob";
import Result "mo:base/Result";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";
import Bool "mo:base/Bool";
import U "utils";
import Leveling "leveling";
import BookingSystem "bookings";

shared ({ caller = creator }) actor class () = this {
  type Request = Server.Request;
  type Response = Server.Response;
  type HttpRequest = Server.HttpRequest;
  type HttpResponse = Server.HttpResponse;
  type ResponseClass = Server.ResponseClass;
  type ChunkId = fileStorage.ChunkId;

  stable var serializedEntries : Server.SerializedEntries = ([], [], [creator]);
  var server = Server.Server({ serializedEntries });
  let assets = server.assets;

  // stable var scan_count : Nat = 0;
  // stable var cmacs : [Text] = [];

  stable var levelingStats : Leveling.Stats = {
    var current_xp = 0;
    var current_level = 0;
    var total_plays = 0;
  };

  let leveling = Leveling.Leveling(levelingStats);

  stable let fileStorageState = fileStorage.init();
  let file_storage = fileStorage.FileStorage(fileStorageState);

  stable let routesState = Routes.init();
  let routes_storage = Routes.RoutesStorage(routesState);

  public shared ({ caller }) func add_protected_route(path : Text) : async () {
    assert (caller == creator);
    ignore routes_storage.addProtectedRoute(path);
  };

  public shared ({ caller }) func update_route_cmacs(path : Text, new_cmacs : [Text]) : async () {
    assert (caller == creator);
    ignore routes_storage.updateRouteCmacs(path, new_cmacs);
  };

  public shared ({ caller }) func append_route_cmacs(path : Text, new_cmacs : [Text]) : async () {
    assert (caller == creator);
    ignore routes_storage.appendRouteCmacs(path, new_cmacs);
  };

  public query func get_route_protection(path : Text) : async ?Routes.ProtectedRoute {
    routes_storage.getRoute(path);
  };

  public query func get_route_cmacs(path : Text) : async [Text] {
    routes_storage.getRouteCmacs(path);
  };


   stable let bookingState = BookingSystem.init();
    let booking_system = BookingSystem.BookingSystem(bookingState);

    // Session Management
    public shared({ caller }) func addSession(day: Text, time: Text) : async Nat {
        // assert(caller == creator);
        booking_system.addSession(day, time)
    };

    public shared({ caller }) func removeSession(id: Nat) : async Bool {
        // assert(caller == creator);
        booking_system.removeSession(id)
    };

    public query func getSessionsByDay() : async [(Text, [BookingSystem.Session])] {
        booking_system.getSessionsByDay()
    };

    // Booking Management
    public shared func makeBooking(sessionId: Nat, user: BookingSystem.UserInfo) : async Bool {
        booking_system.makeBooking(sessionId, user)
    };

    public shared func cancelBooking(phone: Text) : async Bool {
        booking_system.cancelBooking(phone)
    };

    public query func getUserBooking(phone: Text) : async ?(BookingSystem.Booking, BookingSystem.Session) {
        booking_system.getUserBooking(phone)
    };

    public query func isSessionBooked(sessionId: Nat) : async Bool {
        booking_system.isSessionBooked(sessionId)
    };

    public shared({ caller }) func resetAllBookings() : async () {
        // assert(caller == creator);
        booking_system.resetAllBookings()
    };

  public query func getSessionBooking(sessionId: Nat) : async ?BookingSystem.Booking {
    booking_system.getSessionBooking(sessionId)
};
     



  public query func getLevelingStats() : async Leveling.StatsResponse {
    leveling.getStats()
  };

  public func upload(chunk : [Nat8]) : async () {
    file_storage.upload(chunk);
  };

  public func uploadFinalize(title : Text, artist : Text, contentType : Text) : async Result.Result<Text, Text> {
    let uploadResult = file_storage.uploadFinalize(title, artist, contentType);

    switch (uploadResult) {
      case (#ok(msg)) {
        leveling.awardUploadXP();
        #ok(msg);
      };
      case (#err(msg)) {
        #err(msg);
      };
    };
  };

  public query func getFileChunk(title : Text, chunkId : ChunkId) : async ?{
    chunk : [Nat8];
    totalChunks : Nat;
    contentType : Text;
    title : Text;
    artist : Text;
  } {
    file_storage.getFileChunk(title, chunkId);
  };

  public query func listFiles() : async [(Text, Text, Text)] {
    file_storage.listFiles();
  };

  public func deleteFile(title : Text) : async Bool {
    file_storage.deleteFile(title);
  };

  public query func getStoredFileCount() : async Nat {
    file_storage.getStoredFileCount();
  };

  public query ({ caller }) func whoAmI() : async Principal {
    return caller;
  };

  public query func get_cycle_balance() : async Nat {
    return Cycles.balance();
  };

  public query func listAuthorized() : async [Principal] {
    server.entries().2;
  };

  public shared ({ caller }) func deauthorize(other : Principal) : async () {
    assert (caller == creator);
    let (urls, patterns, authorized) = server.entries();
    let filtered = Array.filter<Principal>(
      authorized,
      func(p) { p != other },
    );
    serializedEntries := (urls, patterns, filtered);
    server := Server.Server({ serializedEntries });
  };

  public shared ({ caller }) func authorize(other : Principal) : async () {
    server.authorize({ caller; other });
  };

  public query func retrieve(path : Assets.Path) : async Assets.Contents {
    assets.retrieve(path);
  };

  public shared ({ caller }) func store(
    arg : {
      key : Assets.Key;
      content_type : Text;
      content_encoding : Text;
      content : Blob;
      sha256 : ?Blob;
    }
  ) : async () {
    server.store({ caller; arg });
  };


  public query func http_request(req : HttpRequest) : async HttpResponse {

    let request = {
      url = U.normalizeUrl(req.url);
      method = req.method;
      body = req.body;
      headers = req.headers;
    };


   if (routes_storage.isProtectedRoute(request.url)) {
    Debug.print("came here");
      return {
        status_code = 426;
        headers = [];
        body = Blob.fromArray([]);
        streaming_strategy = null;
        upgrade = ?true;
      };
    };

    server.http_request(request);

  };

  public func http_request_update(req : HttpRequest) : async HttpResponse {

    let request = {
      url = U.normalizeUrl(req.url);
      method = req.method;
      body = req.body;
      headers = req.headers;
    };



     // Extract trackId first if present
    let urlParts = Iter.toArray(Text.split(req.url, #char '?'));
    var trackId = "";
            
    if (urlParts.size() > 1) {
        let queryParams = Iter.toArray(Text.split(urlParts[1], #char '&'));
        for (param in queryParams.vals()) {
            let keyValue = Iter.toArray(Text.split(param, #char '='));
            if (keyValue.size() == 2 and keyValue[0] == "id") {
                trackId := keyValue[1];
            };
        };
    };

    let routes_array = routes_storage.listProtectedRoutes();
    for ((path, protection) in routes_array.vals()) {
        if (Text.contains(path, #text "track.html/")) {
            // If we have a track ID and it matches this protection
            if (trackId != "" and path == "track.html/" # trackId) {
                // Check for valid scan - only for XP
                let hasAccess = routes_storage.verifyRouteAccess(path, req.url);
                if (hasAccess) {
                    leveling.awardPlayXP();
                };
                
                // Always return the track page
                let new_request = {
                    url = "/track.html?id=" # trackId;
                    method = request.method;
                    body = request.body;
                    headers = request.headers;
                };
                return await server.http_request_update(new_request);
            };
        }
        // For non-track routes, keep normal protection
        else if (Text.contains(request.url, #text path)) {
            let hasAccess = routes_storage.verifyRouteAccess(path, req.url);
            let new_request = {
                url = if (hasAccess) {
                    "/" # path
                } else {
                    "/edge.html"
                };
                method = request.method;
                body = request.body;
                headers = request.headers;
            };
            return await server.http_request_update(new_request);
        };
    };

    await server.http_request_update(request);
  };

  public func invalidate_cache() : async () {
    server.empty_cache();
  };

  system func preupgrade() {
    serializedEntries := server.entries();

  };

  system func postupgrade() {
    ignore server.cache.pruneAll();

  };

  public query func list(arg : {}) : async [T.AssetDetails] {
    assets.list(arg);
  };

  public query func get(
    arg : {
      key : T.Key;
      accept_encodings : [Text];
    }
  ) : async ({
    content : Blob;
    content_type : Text;
    content_encoding : Text;
    total_length : Nat;
    sha256 : ?Blob;
  }) {
    assets.get(arg);
  };

  public shared ({ caller }) func create_batch(arg : {}) : async ({
    batch_id : T.BatchId;
  }) {
    assets.create_batch({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func create_chunk(
    arg : {
      batch_id : T.BatchId;
      content : Blob;
    }
  ) : async ({
    chunk_id : T.ChunkId;
  }) {
    assets.create_chunk({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func commit_batch(args : T.CommitBatchArguments) : async () {
    assets.commit_batch({
      caller;
      args;
    });
  };

  public shared ({ caller }) func create_asset(arg : T.CreateAssetArguments) : async () {
    assets.create_asset({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func set_asset_content(arg : T.SetAssetContentArguments) : async () {
    assets.set_asset_content({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func unset_asset_content(args : T.UnsetAssetContentArguments) : async () {
    assets.unset_asset_content({
      caller;
      args;
    });
  };

  public shared ({ caller }) func delete_asset(args : T.DeleteAssetArguments) : async () {
    assets.delete_asset({
      caller;
      args;
    });
  };

  public shared ({ caller }) func clear(args : T.ClearArguments) : async () {
    assets.clear({
      caller;
      args;
    });
  };

  public type StreamingCallbackToken = {
    key : Text;
    content_encoding : Text;
    index : Nat;
    sha256 : ?Blob;
  };

  public type StreamingCallbackHttpResponse = {
    body : Blob;
    token : ?StreamingCallbackToken;
  };

  public query func http_request_streaming_callback(token : T.StreamingCallbackToken) : async StreamingCallbackHttpResponse {
    assets.http_request_streaming_callback(token);
  };

};
