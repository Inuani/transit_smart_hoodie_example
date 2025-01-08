import Server "mo:server";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
// import Nat16 "mo:base/Nat16";
import Assets "mo:assets";
import T "mo:assets/Types";
import Cycles "mo:base/ExperimentalCycles";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Scan "scan";

import Buffer "mo:base/Buffer";
import Blob "mo:base/Blob";
import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import Iter "mo:base/Iter";

shared ({ caller = creator }) actor class () = this {
  type Request = Server.Request;
  type Response = Server.Response;
  type HttpRequest = Server.HttpRequest;
  type HttpResponse = Server.HttpResponse;
  type ResponseClass = Server.ResponseClass;

  stable var serializedEntries : Server.SerializedEntries = ([], [], [creator]);
  stable var scan_count : Nat = 0;

    type ChunkId = Nat;
    type FileChunk = [Nat8];
    type StoredFile = {
        title: Text;
        contentType: Text;
        totalChunks: Nat;
        data: [FileChunk];
    };

    // Create stable storage for the entries
    stable var entries : [(Text, StoredFile)] = [];

    // Create HashMap in variable initialization
    var storedFiles : HashMap.HashMap<Text, StoredFile> = HashMap.fromIter(entries.vals(), 0, Text.equal, Text.hash);

    private var buffer = Buffer.Buffer<Nat8>(0);
    let chunkSize : Nat = 2000000;
    let maxFiles : Nat = 10;

    
    public func upload(chunk: [Nat8]) : async () {
        for (byte in chunk.vals()) {
            buffer.add(byte);
        };
    };

    public func uploadFinalize(title: Text, contentType: Text) : async Result.Result<Text, Text> {
    if (storedFiles.size() >= maxFiles and Option.isNull(storedFiles.get(title))) {
        return #err("Maximum number of files reached");
    };
    
    let data = Buffer.toArray(buffer);
    let totalChunks : Nat = Nat.max(1, (data.size() + chunkSize) / chunkSize);
    var chunks : [FileChunk] = [];
    var i = 0;
    
    while (i < data.size()) {
        let end = Nat.min(i + chunkSize, data.size());
        let chunk = Array.tabulate<Nat8>(end - i, func(j) = data[i + j]);
        chunks := Array.append(chunks, [chunk]);
        i += chunkSize;
    };
    
    storedFiles.put(title, {
        title = title;
        contentType = contentType;
        totalChunks = totalChunks;
        data = chunks;
    });
    
    buffer.clear();
    #ok("Upload successful")
};

    public query func getFileChunk(title: Text, chunkId: ChunkId) : async ?{
        chunk: [Nat8];
        totalChunks: Nat;
        contentType: Text;
        title: Text;
    } {
        switch(storedFiles.get(title)) {
            case(null) { null };
            case(?file) {
                if (chunkId >= file.data.size()) return null;
                ?{
                    chunk = file.data[chunkId];
                    totalChunks = file.totalChunks;
                    contentType = file.contentType;
                    title = file.title;
                }
            };
        };
    };

    public query func listFiles() : async [(Text, Text)] {
        let entries = Iter.toArray(storedFiles.entries());
        Array.map<(Text, StoredFile), (Text, Text)>(
            entries,
            func((title, file)) = (title, file.contentType)
        )
    };

    public func deleteFile(title: Text) : async Bool {
        switch(storedFiles.remove(title)) {
            case(null) { false };
            case(?_) { true };
        }
    };

    public query func getStoredFileCount() : async Nat {
        storedFiles.size()
    };

var server = Server.Server({ serializedEntries });

  public query ({ caller }) func whoAmI() : async Principal {
    return caller;
};

public query func get_cycle_balance() : async Nat {
  return Cycles.balance();
};



  server.get(
    "/404",
    func(_ : Request, res : ResponseClass) : async Response {
      res.send({
        status_code = 404;
        headers = [("Content-Type", "text/plain")];
        body = Text.encodeUtf8("Not found");
        streaming_strategy = null;
        cache_strategy = #noCache;
      });
    },
  );



   let assets = server.assets;

   public query func listAuthorized() : async [Principal] {
    server.entries().2
  };

  public shared({ caller }) func deauthorize(other: Principal) : async () {
  assert(caller == creator);
  let (urls, patterns, authorized) = server.entries();
  let filtered = Array.filter<Principal>(
    authorized, 
    func(p) { p != other }
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
   server.http_request(req);
};

public func http_request_update(req : HttpRequest) : async HttpResponse {
    
    // Debug.print("Received URL: " # req.url);

    // if (req.url == "/admin.html") {
    //   Debug.print("Admin route detected");
    //     let counter = Scan.scan(req.url, scan_count);
    //     let new_request = {
    //         url = if (counter > 0) {
    //             scan_count := counter;
    //             "/admin.html"  
    //         } else {
    //             "/edge.html"  
    //         };
    //         method = req.method;
    //         body = req.body;
    //         headers = req.headers;
    //     };
    //     return await server.http_request_update(new_request);
    // };

    await server.http_request_update(req);
};

  public func invalidate_cache() : async () {
    server.empty_cache();
  };

  system func preupgrade() {
    serializedEntries := server.entries();

    entries := Iter.toArray(storedFiles.entries());
  };

  system func postupgrade() {
    ignore server.cache.pruneAll();

    entries := [];
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


//     server.get(
//   "/balance",
//   func(_ : Request, res : ResponseClass) : async Response {
//     let balance = Nat.toText(Cycles.balance());
//     res.send({
//       status_code = 200;
//       headers = [("Content-Type", "text/plain")];
//       body = Text.encodeUtf8(balance);
//       streaming_strategy = null;
//       cache_strategy = #noCache;
//     });
//   },
// );

  // server.get(
  //   "/json",
  //   func(_ : Request, res : ResponseClass) : async Response {
  //     res.json({
  //       status_code = 200;
  //       body = "{\"hello\":\"world\"}";
  //       cache_strategy = #noCache;
  //     });
  //   },
  // );

  //   public func removeDuplicates() : async () {
//  // Use a buffer to store unique principals
//  let seen = Buffer.Buffer<Principal>(0);
 
//  for (p in server.authorized.vals()) {
//    // Only add if not already seen
//    if (Option.isNull(Array.find(Buffer.toArray(seen), func(x: Principal) : Bool { x == p }))) {
//      seen.add(p);
//    };
//  };
 
//  // Update authorized with deduplicated array
//  server.authorized := Buffer.toArray(seen);
 
//  // Recreate server with new authorized list
//  let (urls, patterns, _) = server.entries();
//  serializedEntries := (urls, patterns, server.authorized);
//  server := Server.Server({ serializedEntries });
// };

};
