import React, { useEffect, useState } from "react";
import * as fcl from "@onflow/fcl";
import * as sdk from "@onflow/sdk";
import * as types from "@onflow/types";
import "./styles.css";

fcl
  .config()
  .put("challenge.handshake", "http://localhost:8701/flow/authenticate");

const executeSimpleScript = async (a, b) => {
  const response = await fcl.send([
    sdk.script`
      pub fun main(a: Int, b: Int):Int {
        return a + b
      }
    `,
    sdk.args([sdk.arg(a, types.Int), sdk.arg(b, types.Int)]),
  ]);

  return fcl.decode(response);
};

const simpleTransaction = async () => {
  const { authorization } = fcl.currentUser();
  const tx = await fcl.send([
    fcl.transaction`
      transaction {
        prepare(acct: AuthAccount) {
          log("Transaction Submitted")
        }
      }
    `,
    sdk.payer(authorization),
    sdk.proposer(authorization),
    sdk.authorizations([authorization]),
    sdk.limit(100),
  ]);

  console.log({ tx });

  fcl.tx(tx).subscribe((txStatus) => {
    if (fcl.tx.isExecuted(txStatus)) {
      console.log("Transaction was executed");
    }
  });
};

const deployHelloCadence = async () => {
  const code = `
    access(all) contract HelloWorld {
      pub event CustomEvent(x: Int, y: Int)

      access(all) let greeting: String

      init() {
          self.greeting = "Hello, Cadence!"
      }
  
      access(all) fun hello(): String {
          emit CustomEvent(x: 4, y: 2)
          return self.greeting
      }
    }
  `;
  const { authorization } = fcl.currentUser();
  const tx = await fcl.send([
    sdk.transaction`
          transaction(code: String) {
            prepare(acct: AuthAccount) {
              acct.setCode(code.decodeHex())
            }
          }
        `,
    fcl.args([
      fcl.arg(Buffer.from(code, "utf8").toString("hex"), types.String),
    ]),
    fcl.proposer(authorization),
    fcl.payer(authorization),
    fcl.authorizations([authorization]),
    fcl.limit(100),
  ]);

  console.log({ tx });

  fcl.tx(tx).subscribe((txStatus) => {
    if (fcl.tx.isExecuted(txStatus)) {
      console.log("Contract was deployed");
    }
  });
};

const pingAccount = async () => {
  const { authorization } = fcl.currentUser();

  const tx = await fcl.send([
    fcl.transaction`
    import HelloWorld from 0x01cf0e2f2f715450

    transaction {
    
      prepare(acct: AuthAccount) {}
    
      execute {
        log(HelloWorld.hello())
      }
    }
  `,
    fcl.proposer(authorization),
    fcl.payer(authorization),
    fcl.authorizations([authorization]),
  ]);

  fcl.tx(tx).subscribe((txStatus) => {
    if (fcl.tx.isExecuted(txStatus)) {
      console.log("Transaction was executed");
    }
  });
};

const getEvents = async (params) => {
  // Define event type from params
  const { contractAddress, contractName, eventName } = params;
  const eventType = `A.${contractAddress}.${contractName}.${eventName}`;

  const { from = 0, to } = params;
  let toBlock;
  if (to === undefined) {
    // Get latest block
    const blockResponse = await fcl.send(
      await sdk.build([sdk.getLatestBlock()])
    );
    toBlock = blockResponse.latestBlock.height;
  } else {
    toBlock = to;
  }

  const response = await fcl.send(
    await sdk.build([sdk.getEvents(eventType, from, toBlock)])
  );

  // Return a list of events
  return response.events;
};

const getHelloEvents = async () => {
  const events = await getEvents({
    contractName: "HelloWorld",
    contractAddress: "01cf0e2f2f715450", // note the address is without "0x" prefix
    eventName: "CustomEvent",
  });
  console.log({ events });
};

function App() {
  const [user, setUser] = useState(null);

  const handleUser = (user) => {
    if (user.cid) {
      setUser(user);
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    return fcl.currentUser().subscribe(handleUser);
  }, []);

  const [scriptResult, setScriptResult] = useState(null);
  const callScript = async () => {
    const result = await executeSimpleScript(10, 20);
    setScriptResult(result);
  };

  const userLoggedIn = user && !!user.cid;

  return (
    <div>
      <button onClick={callScript}>Execute Script</button>
      {scriptResult && (
        <div>
          <p className="script-result">Computation Result: {scriptResult}</p>
        </div>
      )}

      {!userLoggedIn ? (
        <button
          onClick={() => {
            fcl.authenticate();
          }}
        >
          Login
        </button>
      ) : (
        <>
          <h1 className="welcome">Welcome, {user.identity.name}</h1>
          <p>Your Address</p>
          <p className="address">{user.addr}</p>
          <button onClick={simpleTransaction}>Submit Tx</button>
          <button onClick={deployHelloCadence}>Deploy Hello Contract</button>
          <button onClick={pingAccount}>Ping for Hello</button>
          <button onClick={getHelloEvents}>Get events</button>
          <button
            onClick={() => {
              fcl.unauthenticate();
            }}
          >
            Logout
          </button>
        </>
      )}
    </div>
  );
}

export default App;
