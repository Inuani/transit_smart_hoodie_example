import { HttpAgent, Actor } from "@dfinity/agent";

const idlFactory = ({ IDL }) => IDL.Service({
  whoAmI: IDL.Func([], [IDL.Principal], ["query"]),
  get_cycle_balance: IDL.Func([], [IDL.Nat], ["query"]),
  remove_self_controller: IDL.Func([], [], []),
  is_controller: IDL.Func([IDL.Principal], [IDL.Bool], ["query"]),
  
  claim_ownership: IDL.Func([], [IDL.Bool], []),
  drop_ownership: IDL.Func([], [], []),
  get_owner: IDL.Func([], [IDL.Principal], ["query"]),
  is_owner: IDL.Func([IDL.Principal], [IDL.Bool], ["query"]),

upload: IDL.Func([IDL.Vec(IDL.Nat8)], [], []),
    
uploadFinalize: IDL.Func(
  [IDL.Text, IDL.Text, IDL.Text], // [title, artist, contentType]
  [IDL.Variant({
      ok: IDL.Text,
      err: IDL.Text
  })],
  []
),

getFileChunk: IDL.Func(
  [IDL.Text, IDL.Nat], // [title, chunkId]
  [IDL.Opt(IDL.Record({
      chunk: IDL.Vec(IDL.Nat8),
      totalChunks: IDL.Nat,
      contentType: IDL.Text,
      title: IDL.Text,
      artist: IDL.Text  // Add artist field here
  }))],
  ["query"]
),

listFiles: IDL.Func(
  [],
  [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text, IDL.Text))], // [title, artist, contentType]
  ["query"]
),

deleteFile: IDL.Func([IDL.Text], [IDL.Bool], []),

getLevelingStats: IDL.Func([], [IDL.Record({
  current_xp: IDL.Nat,
  current_level: IDL.Nat,
  total_plays: IDL.Nat,
  xp_to_next_level: IDL.Nat,
  current_level_xp: IDL.Nat,
  total_xp_current_level: IDL.Nat,
  current_level_progress: IDL.Nat
})], ["query"]),


trackPlay: IDL.Func([], [], []),

addSession: IDL.Func([IDL.Text, IDL.Text], [IDL.Nat], []),
    
    removeSession: IDL.Func([IDL.Nat], [IDL.Bool], []),
    
    getSessionsByDay: IDL.Func([], [
        IDL.Vec(IDL.Tuple(
            IDL.Text,  // day
            IDL.Vec(IDL.Record({   // sessions
                id: IDL.Nat,
                day: IDL.Text,
                time: IDL.Text,
                isEnabled: IDL.Bool
            }))
        ))
    ], ["query"]),
    
    makeBooking: IDL.Func([
        IDL.Nat,  // sessionId
        IDL.Record({  // UserInfo
            name: IDL.Text,
            phone: IDL.Text
        })
    ], [IDL.Bool], []),
    
    cancelBooking: IDL.Func([IDL.Text], [IDL.Bool], []),
    
    getUserBooking: IDL.Func([IDL.Text], [
        IDL.Opt(IDL.Tuple(
            IDL.Record({  // Booking
                sessionId: IDL.Nat,
                user: IDL.Record({
                    name: IDL.Text,
                    phone: IDL.Text
                })
            }),
            IDL.Record({  // Session
                id: IDL.Nat,
                day: IDL.Text,
                time: IDL.Text,
                isEnabled: IDL.Bool
            })
        ))
    ], ["query"]),
    
    isSessionBooked: IDL.Func([IDL.Nat], [IDL.Bool], ["query"]),
    
    resetAllBookings: IDL.Func([], [], []),

    getSessionBooking: IDL.Func(
      [IDL.Nat], // sessionId
      [IDL.Opt(IDL.Record({
          user: IDL.Record({
              name: IDL.Text,
              phone: IDL.Text
          }),
          sessionId: IDL.Nat
      }))],
      ["query"]
  )

});


const createActor = (options = {}) => {
  const agent = new HttpAgent({
    host: process.env.DFX_NETWORK === "ic" ? "https://ic0.app" : "http://localhost:4943",
    ...options
  });
  
  if (process.env.DFX_NETWORK !== "ic") {
    agent.fetchRootKey().catch(console.error);
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: process.env.CANISTER_ID_SMART_RAP_CLOTH
  });
};

const subscribers = new Set();
let currentActor = createActor();

export const actor = currentActor;

export const updateActorIdentity = (identity) => {
  currentActor = createActor({ identity });
  subscribers.forEach(cb => cb(currentActor));
  return currentActor;
};

export const subscribeToActor = (callback) => {
  subscribers.add(callback);
  callback(currentActor);
  return () => subscribers.delete(callback);
};