include .env

# Access routes in a local replica
# canisterId.localhost:4943/whatever_route
# http://bw4dl-smaaa-aaaaa-qaacq-cai.localhost:4943/hi

#icx-asset --replica http://127.0.0.1:4943 --pem ~/.config/dfx/identity/raygen/identity.pem upload $(CANISTER_ID_VELCRO_BOOT) /index.html=src/frontend/public/index.html

# npx repomix --ignore ".mops/,.dfx/,.vscode,node_module/,.gitignore,src/frontend/public/bundle.js,src/frontend/public/edge.html,generate_identity.js,upload.js,identity.json"

# dfx canister call --ic velcro_boot invalidate_cache

# dfx canister --ic deposit-cycles 1000000000000 velcro_boot

# add the canister as controler of himself through the management canister
# dfx canister update-settings --add-controller $(CANISTER_ID_VELCRO_BOOT) $(CANISTER_ID_VELCRO_BOOT)

REPLICA_URL := $(if $(filter ic,$(subst ',,$(DFX_NETWORK))),https://ic0.app,http://127.0.0.1:4943)
CANISTER_NAME := $(shell jq -r '.canisters | keys[1]' dfx.json)

# Detect operating system for the open command
UNAME := $(shell uname)
ifeq ($(UNAME), Darwin)
    OPEN_CMD := open
else ifeq ($(UNAME), Linux)
    OPEN_CMD := xdg-open
else
    OPEN_CMD := start
endif

all:
	dfx deploy $(CANISTER_NAME)
	dfx canister call $(CANISTER_NAME) invalidate_cache
	
ic:
	dfx deploy --ic
	dfx canister call --ic $(CANISTER_ID_$(shell echo $(CANISTER_NAME) | tr '[:lower:]' '[:upper:]')) invalidate_cache

url:
	$(OPEN_CMD) http://$(CANISTER_ID_$(shell echo $(CANISTER_NAME) | tr '[:lower:]' '[:upper:]')).localhost:4943/

upload_assets:
	npm run build
	icx-asset --replica $(REPLICA_URL) --pem ~/.config/dfx/identity/raygen/identity.pem sync $(CANISTER_ID_$(shell echo $(CANISTER_NAME) | tr '[:lower:]' '[:upper:]')) src/frontend/public
	dfx canister call $(if $(filter https://ic0.app,$(REPLICA_URL)),--ic,) $(CANISTER_NAME) invalidate_cache

gen_cmacs:
	python3 scripts/hashed_cmacs.py -k 00000000000000000000000000000000 -u 047423A2E51090 -c 100 -d src/backend/hashed_cmacs.mo

debug:
	@echo "Canister name is: $(CANISTER_NAME)"
	@echo "Canister ID variable: CANISTER_ID_$(shell echo $(CANISTER_NAME) | tr '[:lower:]' '[:upper:]')"
