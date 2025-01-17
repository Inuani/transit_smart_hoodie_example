import Server "mo:server";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Assets "mo:assets";
import T "mo:assets/Types";
import Cycles "mo:base/ExperimentalCycles";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Scan "scan";
import fileStorage "file_storage";

import Blob "mo:base/Blob";
import Result "mo:base/Result";
import U "utils";

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

  stable var scan_count : Nat = 0;
  stable var cmacs : [Text] = [];

  stable let fileStorageState = fileStorage.init();
  let file_storage = fileStorage.FileStorage(fileStorageState);

  public func upload(chunk : [Nat8]) : async () {
    file_storage.upload(chunk);
  };

  public func uploadFinalize(title : Text, artist : Text, contentType : Text) : async Result.Result<Text, Text> {
    file_storage.uploadFinalize(title, artist, contentType);
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

  public shared ({ caller }) func update_cmacs(new_cmacs : [Text]) : async () {
    assert (caller == creator);
    cmacs := new_cmacs;
  };

  public shared ({ caller }) func append_cmacs(new_cmacs : [Text]) : async () {
    assert (caller == creator);
    cmacs := Array.append(cmacs, new_cmacs);
  };

  public query func get_cmacs() : async [Text] {
    cmacs;
  };

  public query func http_request(req : HttpRequest) : async HttpResponse {

    let request = {
      url = U.normalizeUrl(req.url);
      method = req.method;
      body = req.body;
      headers = req.headers;
    };

    if (Text.contains(request.url, #text "admin.html") or Text.contains(request.url, #text "track.html")) {
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

    Debug.print(request.url);

    // if (Text.contains(request.url, #text "admin.html")) {
    //   let counter = Scan.scan(cmacs, req.url, scan_count);
    //     let new_request = {
    //         url = if (counter > 0) {
    //             scan_count := counter;
    //             "/admin.html"
    //         } else {
    //             "/edge.html"
    //         };
    //         method = request.method;
    //         body = request.body;
    //         headers = request.headers;
    //     };
    //     return await server.http_request_update(new_request);
    // };
    await server.http_request_update(request);
  };

  public func invalidate_cache() : async () {
    server.empty_cache();
  };

  system func preupgrade() {
    serializedEntries := server.entries();

    // entries := Iter.toArray(storedFiles.entries());
  };

  system func postupgrade() {
    ignore server.cache.pruneAll();

    // entries := [];
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
