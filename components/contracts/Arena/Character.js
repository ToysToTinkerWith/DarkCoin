import React, { useEffect, useState } from "react";

import algosdk from "algosdk";

import {
  Typography,
  Button,
  Grid,
  LinearProgress,
  linearProgressClasses,
  styled,
} from "@mui/material";

import { useWallet } from "@txnlab/use-wallet-react";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { useRouter } from "next/router";

import { CID } from "multiformats/cid";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

import * as mfsha2 from "multiformats/hashes/sha2";
import * as digest from "multiformats/hashes/digest";

// Import the component (default) and the data (named)
import { trees } from "./Trees.js";

// Render:
// <SkillTrees onSelect={(skill, treeIdx, tierIdx) => console.log(skill, treeIdx, tierIdx)} />

const BorderLinearProgressHealth = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor:
      theme.palette.grey[theme.palette.mode === "light" ? 200 : 800],
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: theme.palette.mode === "light" ? "#B92C2C" : "#308fe8",
  },
}));

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor:
      theme.palette.grey[theme.palette.mode === "light" ? 200 : 800],
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: theme.palette.mode === "light" ? "#1a90ff" : "#308fe8",
  },
}));

export default function Character(props) {
  const {
    wallets,
    activeWallet,
    activeAddress,
    isReady,
    signTransactions,
    sendTransactions, // <-- added because you use sendTransactions() below
    transactionSigner,
    algodClient,
  } = useWallet();

  const [nft, setNft] = useState(null);
  const [nftUrl, setNftUrl] = useState(null);
  const [charStats, setCharStats] = useState(null);

  const [charObject, setCharObject] = useState(null);
  const [action, setAction] = useState(null);

  const [xp, setXp] = useState(0);

  const [windowSize, setWindowSize] = useState([0, 0]);

  const [tree, setTree] = useState(null);
  const [points, setPoints] = useState(new Uint8Array(1600));
  const [oldPoints, setOldPoints] = useState(new Uint8Array(1600));

  const router = useRouter();

  const fetchData = async () => {
    try {
      let response = await fetch("/api/getNft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nftId: props.nftId,
        }),
      });

      let session = await response.json();

      if (session.charObject != "none") {
        setCharObject(session.charObject.charObj);
      }
      if (session.action) {
        setAction(session.action);
      }

      if (
        session.nft.assets[0].params.creator ==
        "L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY"
      ) {
        const addr = algosdk.decodeAddress(session.nft.assets[0].params.reserve);

        const mhdigest = digest.create(mfsha2.sha256.code, addr.publicKey);

        const ocid = CID.create(0, 0x70, mhdigest);

        let char = JSON.parse(session.charStats);

        let properties = JSON.stringify(char.properties);
        setNft(session.nft.assets[0].params);
        setNftUrl("https://ipfs.dark-coin.io/ipfs/" + ocid.toString());
        setCharStats(properties);
      } else {
        setNft(session.nft.assets[0].params);
        setNftUrl(
          "https://ipfs.dark-coin.io/ipfs/" +
            session.nft.assets[0].params.url.slice(34)
        );
        setCharStats(session.charStats);
      }

      const indexerClient = new algosdk.Indexer(
        "",
        "https://mainnet-idx.algonode.cloud",
        443
      );

      await indexerClient.searchForTransactions(1870514811).do();

      const client = new algosdk.Algodv2(
        "",
        "https://mainnet-api.algonode.cloud",
        443
      );

      let assetBox = algosdk.encodeUint64(props.nftId);

      try {
        let accountBoxXp = await client
          .getApplicationBoxByName(
            props.contracts.dragonshorde,
            new Uint8Array([...assetBox, ...new Uint8Array(Buffer.from("xp"))])
          )
          .do();

        var length = accountBoxXp.value.length;

        let buffer = Buffer.from(accountBoxXp.value);
        var result = buffer.readUIntBE(0, length);

        setXp(result);
      } catch (err) {
        // console.log(err)
      }

      try {
        let accountBoxPoints = await client
          .getApplicationBoxByName(
            props.contracts.dragonshorde,
            new Uint8Array([
              ...assetBox,
              ...new Uint8Array(Buffer.from("points")),
            ])
          )
          .do();

        setOldPoints(accountBoxPoints.value);
        setPoints(accountBoxPoints.value);
      } catch (err) {
        // console.log(err)
      }

      const windowSizeHandler = () => {
        setWindowSize([window.innerWidth, window.innerHeight]);
      };
      window.addEventListener("resize", windowSizeHandler);
      setWindowSize([window.innerWidth, window.innerHeight]);

      return () => {
        window.removeEventListener("resize", windowSizeHandler);
      };
    } catch (error) {
      // props.sendDiscordMessage(error, "Fetch Char", activeAccount.address)
    }
  };

  React.useEffect(() => {
    if (props.nftId) {
      fetchData();
    }
  }, [router]);

  const assignPoints = (byte, action, max, tier) => {
    let level = 1;
    let nextLvl = 100;

    while (xp >= nextLvl) {
      nextLvl = nextLvl + 200 * level + 100;
      level++;
    }

    let totalPoints = 0;

    for (let i = 0; i < points.length; i++) {
      totalPoints += points[i];
    }

    let treeByte = Math.floor(byte / 100);

    let newPoints = points.slice();

    if (totalPoints > level - 1 && action == "plus") {
    } else if (tier == 1) {
      if (points[treeByte * 100] == 3) {
        if (action == "plus") {
          if (newPoints[byte] + 1 > max) {
          } else {
            newPoints[byte]++;
          }
        } else if (action == "minus") {
          if (newPoints[byte] - 1 < 0) {
          } else {
            newPoints[byte]--;
          }
        }
      }
    } else {
      if (action == "plus") {
        if (newPoints[byte] + 1 > max) {
        } else {
          newPoints[byte]++;
        }
      } else if (action == "minus") {
        if (
          newPoints[byte] - 1 < 0 ||
          points[treeByte * 100 + 1] > 0 ||
          points[treeByte * 100 + 2]
        ) {
        } else {
          newPoints[byte]--;
        }
      }
    }

    setPoints(newPoints);
  };

  function isInt(value) {
    return typeof value === "number" && value % 1 === 0;
  }

  function incrementNumbers(str, byte) {
    return str
      .split(" ")
      .map((token) => {
        if (token.slice(token.length - 1) == "%") {
          return token;
        }
        let num = parseFloat(token);
        if (!isNaN(num)) {
          if (isInt(num)) {
            return String(num * points[byte]);
          } else {
            return String((num * points[byte]).toFixed(1));
          }
        }
        return token;
      })
      .join(" ");
  }

  // ===== NEW: Effective cooldown helper =====
  // effectiveCooldown = baseCooldown * (100 / speed)
  function calcEffectiveCooldown(baseCooldown, speed) {
    const cd = Number(baseCooldown ?? 0);
    const s = Number(speed ?? 0);

    if (!Number.isFinite(cd)) return 0;
    if (!Number.isFinite(s) || s <= 0) return cd;

    return cd * (100 / s);
  }

  const longToByteArray = (long) => {
    var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];

    for (var index = byteArray.length - 1; index > 0; index--) {
      var byte = long & 0xff;
      byteArray[index] = byte;
      long = (long - byte) / 256;
    }

    return byteArray;
  };

  const applyPoints = async () => {
    const client = new algosdk.Algodv2(
      "",
      "https://mainnet-api.algonode.cloud",
      443
    );

    let params = await client.getTransactionParams().do();

    const appArgs = [];

    appArgs.push(new Uint8Array(Buffer.from("applyPoints")), points);

    const accounts = [];
    const foreignApps = [];
    const foreignAssets = [props.nftId];

    let assetInt = longToByteArray(props.nftId);

    let assetBox = new Uint8Array([
      ...assetInt,
      ...new Uint8Array(Buffer.from("points")),
    ]);

    const boxes = [
      { appIndex: 0, name: assetBox },
      { appIndex: 0, name: assetBox },
    ];

    props.setMessage("Sign Transaction...");

    const txn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: activeAddress,
      suggestedParams: params,
      appIndex: props.contracts.dragonshorde,
      appArgs,
      accounts,
      foreignApps,
      foreignAssets,
      boxes,
    })


    let encoded = algosdk.encodeUnsignedTransaction(txn);

    const signedTransactions = await signTransactions([encoded]);

    props.setMessage("Sending Transaction...");

    const { txid } = await client.sendRawTransaction(signedTransactions).do()
    
    let confirmedTxn = await algosdk.waitForConfirmation(client, txid, 4);

    props.setMessage("Transaction Confirmed, Skill Tree Updated");

    fetchData();
  };

  const arraysEqual = (arr1, arr2) =>
    arr1.length === arr2.length && arr1.every((val, i) => val === arr2[i]);

  if (charObject) {
    let level = 1;
    let nextLvl = 100;
    let prevLvl = 0;

    while (xp >= nextLvl) {
      prevLvl = nextLvl;
      nextLvl = nextLvl + 200 * level + 100;
      level++;
    }

    let healthAdj = 0;
    let speedAdj = 0;
    let resistAdj = 0;
    let strengthAdj = 0;
    let dexterityAdj = 0;
    let intelligenceAdj = 0;
    let accuracyAdj = 0;
    let cooldownAdj = 0;

    if (charObject.effects) {
      if (charObject.effects["poison"]) {
        healthAdj -= charObject.effects["poison"] * 1;
      }
      if (charObject.effects["bleed"]) {
        healthAdj -= charObject.effects["bleed"] * 0.7;
        strengthAdj -= charObject.effects["bleed"] * 0.1;
      }
      if (charObject.effects["burn"]) {
        healthAdj -= charObject.effects["burn"] * 0.5;
        intelligenceAdj -= charObject.effects["burn"] * 0.1;
        strengthAdj += charObject.effects["burn"] * 0.1;
        speedAdj += charObject.effects["burn"] * 0.2;
      }
      if (charObject.effects["freeze"]) {
        speedAdj -= charObject.effects["freeze"] * 0.2;
        dexterityAdj -= charObject.effects["freeze"] * 0.2;
      }
      if (charObject.effects["slow"]) {
        speedAdj -= charObject.effects["slow"] * 0.3;
        dexterityAdj -= charObject.effects["slow"] * 0.1;
      }
      if (charObject.effects["paralyze"]) {
        accuracyAdj -= charObject.effects["paralyze"] * 0.2;
      }
      if (charObject.effects["drown"]) {
        dexterityAdj -= charObject.effects["drown"] * 0.3;
        accuracyAdj -= charObject.effects["drown"] * 0.1;
      }
      if (charObject.effects["doom"]) {
        healthAdj -= charObject.effects["doom"] * 0.3;
        resistAdj -= charObject.effects["doom"] * 0.2;
        intelligenceAdj -= charObject.effects["doom"] * 0.2;
      }

      if (charObject.effects["strengthen"]) {
        strengthAdj += charObject.effects["strengthen"] * 0.3;
      }
      if (charObject.effects["empower"]) {
        intelligenceAdj += charObject.effects["empower"] * 0.3;
      }
      if (charObject.effects["hasten"]) {
        dexterityAdj += charObject.effects["hasten"] * 0.3;
        speedAdj += charObject.effects["hasten"] * 0.1;
      }
      if (charObject.effects["nurture"]) {
        healthAdj += charObject.effects["nurture"] * 0.5;
      }
      if (charObject.effects["bless"]) {
        strengthAdj += charObject.effects["bless"] * 0.2;
        intelligenceAdj += charObject.effects["bless"] * 0.2;
        resistAdj += charObject.effects["bless"] * 0.1;
      }
      if (charObject.effects["focus"]) {
        accuracyAdj += charObject.effects["focus"] * 0.3;
      }
    }

    let poisonAdj = oldPoints[0];
    let bleedAdj = oldPoints[100];
    let burnAdj = oldPoints[200];
    let freezeAdj = oldPoints[300];
    let slowAdj = oldPoints[400];
    let drownAdj = oldPoints[500];
    let paralyzeAdj = oldPoints[600];
    let doomAdj = oldPoints[700];

    let shieldAdj = oldPoints[800];
    let strengthenAdj = oldPoints[900];
    let focusAdj = oldPoints[1000];
    let empowerAdj = oldPoints[1100];
    let nurtureAdj = oldPoints[1200];
    let blessAdj = oldPoints[1300];
    let hastenAdj = oldPoints[1400];
    let cleanseAdj = oldPoints[1500];

    return (
      <div>
        <Button
          style={{
            backgroundColor: "white",
            fontFamily: "Jacques",
            padding: 10,
            marginTop: 40,
          }}
          onClick={() => props.deleteChar(props.nftId)}
        >
          <Typography variant="h6"> Delete Character </Typography>
        </Button>
        <div style={{ marginTop: 40, marginBottom: 50 }}>
          <Typography
            color="secondary"
            align="center"
            variant="h4"
            style={{ fontFamily: "Jacques", margin: 20 }}
          >
            {charObject.name}
          </Typography>

          {/* Sized wrapper controls both background + image dimensions */}
          <div
            style={{
              position: "relative",
              width: "25%", // same width as your img used to have
              maxWidth: 400,
              minWidth: 200, // keep your cap
              margin: "0 auto", // center
              borderRadius: 5,
              overflow: "hidden", // clip any overflow of the masked bg
            }}
          >
            {/* Fading-edge background (steeper near edges) */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0, // fills the wrapper (same size as the image)
                backgroundImage: `url(${props.background})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(2px)",
                WebkitMaskImage:
                  "radial-gradient(ellipse at center, rgba(0,0,0,1) 55%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0) 78%)",
                maskImage:
                  "radial-gradient(ellipse at center, rgba(0,0,0,1) 55%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0) 78%)",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

            {/* Foreground image */}
            <img
              src={charObject.standingUrl}
              alt="Champion idle"
              style={{
                display: "block",
                width: "100%", // fills wrapper → bg matches exactly
                height: "auto",
                borderRadius: 5,
                position: "relative",
                zIndex: 1,
              }}
            />
          </div>
        </div>

        <div style={{ marginLeft: "25vw", marginRight: "25vw" }}>
          <BorderLinearProgress
            variant="determinate"
            style={{ marginRight: 10, marginLeft: 10 }}
            value={((xp - prevLvl) / (nextLvl - prevLvl)) * 100}
          />
          <Typography
            align="center"
            variant="caption"
            style={{ fontFamily: "Jacques", display: "grid", color: "#FFFFFF" }}
          >
            {" "}
            {xp} / {nextLvl}{" "}
          </Typography>

          <Typography
            align="center"
            variant="h6"
            style={{
              fontFamily: "Jacques",
              display: "grid",
              margin: 10,
              color: "#FFFFFF",
            }}
          >
            {" "}
            Level {level}{" "}
          </Typography>
        </div>

        {action ? (
          <Typography
            color="secondary"
            align="center"
            variant="subtitle1"
            style={{
              fontFamily: "Jacques",
              margin: 20,
              padding: 20,
              border: "1px solid white",
              borderRadius: 15,
            }}
          >
            {"  "}
            {action.move.name} <ArrowForwardIcon /> {action.target}{" "}
          </Typography>
        ) : null}

        <Grid container style={{ padding: 20 }}>
          <Grid item xs={12}>
            <img
              style={{
                zIndex: 10,
                width: String(50 / (props.length + 3)) + "vw",
                minWidth: 60,
                maxWidth: 80,
                borderRadius: 5,
                display: "flex",
                margin: "auto",
                padding: 5,
              }}
              src={"/dragonshorde/health.svg"}
            />
            <BorderLinearProgressHealth
              variant="determinate"
              style={{ marginRight: 10, marginLeft: 10, color: "white" }}
              value={(charObject.currentHealth / charObject.health) * 100}
            />
            {healthAdj == 0 ? (
              <Typography color="secondary" align="center" variant="subtitle1">
                {" "}
                {Number(charObject.currentHealth).toFixed(1)}{" "}
              </Typography>
            ) : healthAdj < 0 ? (
              <div>
                <Typography color="secondary" align="center" variant="subtitle1">
                  {" "}
                  {Number(charObject.currentHealth).toFixed(1)}{" "}
                </Typography>
                <Typography
                  color="secondary"
                  align="center"
                  variant="subtitle1"
                  style={{ color: "#F8575A" }}
                >
                  {" "}
                  {healthAdj}{" "}
                </Typography>
              </div>
            ) : (
              <div>
                <Typography color="secondary" align="center" variant="subtitle1">
                  {" "}
                  {Number(charObject.currentHealth).toFixed(1)}{" "}
                </Typography>
                <Typography
                  color="secondary"
                  align="center"
                  variant="subtitle1"
                  style={{ color: "#4EC83E" }}
                >
                  {" "}
                  + {healthAdj}{" "}
                </Typography>
              </div>
            )}
          </Grid>
          <Grid item xs={6}>
            <img
              style={{
                zIndex: 10,
                width: String(50 / (props.length + 3)) + "vw",
                minWidth: 50,
                maxWidth: 70,
                borderRadius: 5,
                display: "flex",
                margin: "auto",
                padding: 5,
              }}
              src={"/dragonshorde/speed.svg"}
            />
            {speedAdj == 0 ? (
              <Typography color="secondary" align="center" variant="subtitle1">
                {" "}
                {Number(charObject.speed).toFixed(1)}{" "}
              </Typography>
            ) : speedAdj < 0 ? (
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: "#F8575A" }}
              >
                {" "}
                {Number(charObject.speed + speedAdj).toFixed(1)}{" "}
              </Typography>
            ) : (
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: "#4EC83E" }}
              >
                {" "}
                {Number(charObject.speed + speedAdj).toFixed(1)}{" "}
              </Typography>
            )}
          </Grid>
          <Grid item xs={6}>
            <img
              style={{
                zIndex: 10,
                width: String(50 / (props.length + 3)) + "vw",
                minWidth: 50,
                maxWidth: 70,
                borderRadius: 5,
                display: "flex",
                margin: "auto",
                padding: 5,
              }}
              src={"/dragonshorde/resist.svg"}
            />
            {resistAdj == 0 ? (
              <Typography color="secondary" align="center" variant="subtitle1">
                {" "}
                {Number(charObject.resist).toFixed(1)}{" "}
              </Typography>
            ) : resistAdj < 0 ? (
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: "#F8575A" }}
              >
                {" "}
                {Number(charObject.resist + resistAdj).toFixed(1)}{" "}
              </Typography>
            ) : (
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: "#4EC83E" }}
              >
                {" "}
                {Number(charObject.resist + resistAdj).toFixed(1)}{" "}
              </Typography>
            )}
          </Grid>
        </Grid>

        <Grid container style={{ padding: 20 }}>
          <Grid item xs={4} sm={4} md={4}>
            <img
              style={{
                zIndex: 10,
                width: String(50 / (props.length + 3)) + "vw",
                minWidth: 40,
                maxWidth: 60,
                borderRadius: 5,
                display: "flex",
                margin: "auto",
                padding: 5,
              }}
              src={"/dragonshorde/strength.svg"}
            />
            {strengthAdj == 0 ? (
              <Typography color="secondary" align="center" variant="subtitle1">
                {" "}
                {Number(charObject.strength).toFixed(1)}{" "}
              </Typography>
            ) : strengthAdj < 0 ? (
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: "#F8575A" }}
              >
                {" "}
                {Number(charObject.strength + strengthAdj).toFixed(1)}{" "}
              </Typography>
            ) : (
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: "#4EC83E" }}
              >
                {" "}
                {Number(charObject.strength + strengthAdj).toFixed(1)}{" "}
              </Typography>
            )}
          </Grid>
          <Grid item xs={4} sm={4} md={4}>
            <img
              style={{
                zIndex: 10,
                width: String(50 / (props.length + 3)) + "vw",
                minWidth: 40,
                maxWidth: 60,
                borderRadius: 5,
                display: "flex",
                margin: "auto",
                padding: 5,
              }}
              src={"/dragonshorde/dexterity.svg"}
            />
            {dexterityAdj == 0 ? (
              <Typography color="secondary" align="center" variant="subtitle1">
                {" "}
                {Number(charObject.dexterity).toFixed(1)}{" "}
              </Typography>
            ) : dexterityAdj < 0 ? (
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: "#F8575A" }}
              >
                {" "}
                {Number(charObject.dexterity + dexterityAdj).toFixed(1)}{" "}
              </Typography>
            ) : (
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: "#4EC83E" }}
              >
                {" "}
                {Number(charObject.dexterity + dexterityAdj).toFixed(1)}{" "}
              </Typography>
            )}
          </Grid>
          <Grid item xs={4} sm={4} md={4}>
            <img
              style={{
                zIndex: 10,
                width: String(50 / (props.length + 3)) + "vw",
                minWidth: 40,
                maxWidth: 60,
                borderRadius: 5,
                display: "flex",
                margin: "auto",
                padding: 5,
              }}
              src={"/dragonshorde/intelligence.svg"}
            />
            {intelligenceAdj == 0 ? (
              <Typography color="secondary" align="center" variant="subtitle1">
                {" "}
                {Number(charObject.intelligence).toFixed(1)}{" "}
              </Typography>
            ) : intelligenceAdj < 0 ? (
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: "#F8575A" }}
              >
                {" "}
                {Number(charObject.intelligence + intelligenceAdj).toFixed(1)}{" "}
              </Typography>
            ) : (
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: "#4EC83E" }}
              >
                {" "}
                {Number(charObject.intelligence + intelligenceAdj).toFixed(1)}{" "}
              </Typography>
            )}
          </Grid>
        </Grid>

        <Grid container style={{ padding: 20 }}>
          {charObject["bleed"] + bleedAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Bleed.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: bleedAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.bleed + bleedAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["bless"] + blessAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Bless.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: blessAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.bless + blessAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["burn"] + burnAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Burn.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: burnAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.burn + burnAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["cleanse"] + cleanseAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Cleanse.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: cleanseAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.cleanse + cleanseAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["doom"] + doomAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Doom.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: doomAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.doom + doomAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["drown"] + drownAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Drown.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: drownAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.drown + drownAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["empower"] + empowerAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Empower.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: empowerAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.empower + empowerAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["focus"] + focusAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Focus.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: focusAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.focus + focusAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["freeze"] + freezeAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Freeze.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: freezeAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.freeze + freezeAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["hasten"] + hastenAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Hasten.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: hastenAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.hasten + hastenAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["nurture"] + nurtureAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Nurture.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: nurtureAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.nurture + nurtureAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["paralyze"] + paralyzeAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Paralyze.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: paralyzeAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.paralyze + paralyzeAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["poison"] + poisonAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Poison.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: poisonAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.poison + poisonAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["shield"] + shieldAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Shield.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: shieldAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.shield + shieldAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["slow"] + slowAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Slow.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: slowAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.slow + slowAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
          {charObject["strengthen"] + strengthenAdj > 0 ? (
            <Grid item xs={3} sm={3} md={3}>
              <img
                style={{
                  zIndex: 10,
                  height: String(50 / (props.length + 3)) + "vw",
                  minHeight: 40,
                  maxHeight: 50,
                  borderRadius: 5,
                  display: "flex",
                  margin: "auto",
                  padding: 5,
                }}
                src={"/dragonshorde/trees/Strengthen.svg"}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ color: strengthenAdj > 0 ? "#4EC83E" : "#FFFFFF" }}
              >
                {" "}
                {charObject.strengthen + strengthenAdj}{" "}
              </Typography>
            </Grid>
          ) : null}
        </Grid>

        <Grid container>
          {charObject.moves.length > 0
            ? charObject.moves.map((move, index) => {
                let bonus = 0;
                if (move.effect == "bleed") {
                  bonus = bleedAdj;
                } else if (move.effect == "bless") {
                  bonus = blessAdj;
                } else if (move.effect == "burn") {
                  bonus = burnAdj;
                } else if (move.effect == "cleanse") {
                  bonus = cleanseAdj;
                } else if (move.effect == "doom") {
                  bonus = doomAdj;
                } else if (move.effect == "drown") {
                  bonus = drownAdj;
                } else if (move.effect == "empower") {
                  bonus = empowerAdj;
                } else if (move.effect == "focus") {
                  bonus = focusAdj;
                } else if (move.effect == "freeze") {
                  bonus = freezeAdj;
                } else if (move.effect == "hasten") {
                  bonus = hastenAdj;
                } else if (move.effect == "nurture") {
                  bonus = nurtureAdj;
                } else if (move.effect == "paralyze") {
                  bonus = paralyzeAdj;
                } else if (move.effect == "poison") {
                  bonus = poisonAdj;
                } else if (move.effect == "shield") {
                  bonus = shieldAdj;
                } else if (move.effect == "slow") {
                  bonus = slowAdj;
                } else if (move.effect == "strengthen") {
                  bonus = strengthenAdj;
                }

                // ===== NEW: effective cooldown values (display) =====
                const effectiveSpeed = Math.max(
                  1,
                  Number(charObject.speed + speedAdj)
                ); // clamp >= 1
                const baseCooldown = Number(move.cooldown ?? 0) + cooldownAdj;
                const effectiveCooldown = calcEffectiveCooldown(
                  baseCooldown,
                  effectiveSpeed
                );

                // Optional color: green if faster (lower cd), red if slower (higher cd)
                let effectiveCdColor = "#FFFFFF";
                if (effectiveCooldown < baseCooldown) effectiveCdColor = "#4EC83E";
                else if (effectiveCooldown > baseCooldown)
                  effectiveCdColor = "#F8575A";

                if (move.type) {
                  return (
                    <Grid
                      item
                      sm={4}
                      md={4}
                      lg={4}
                      key={index}
                      style={{
                        border: "1px solid white",
                        padding: 20,
                        borderRadius: 15,
                      }}
                    >
                      <Typography
                        color="secondary"
                        align="center"
                        variant="subtitle1"
                        style={{ fontFamily: "Jacques", margin: 20 }}
                      >
                        {" "}
                        {move.name}{" "}
                      </Typography>

                      {/* ===== Same background as idle image behind move art ===== */}
                      <div
                        style={{
                          position: "relative",
                          width: "50%",
                          maxWidth: 400,
                          margin: "0 auto",
                          borderRadius: 5,
                          overflow: "hidden",
                        }}
                      >
                        {/* Background from idle image */}
                        <div
                          aria-hidden
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage: `url(${props.background})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            filter: "blur(2px)",
                            WebkitMaskImage:
                              "radial-gradient(ellipse at center, rgba(0,0,0,1) 55%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0) 78%)",
                            maskImage:
                              "radial-gradient(ellipse at center, rgba(0,0,0,1) 55%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0) 78%)",
                            WebkitMaskRepeat: "no-repeat",
                            maskRepeat: "no-repeat",
                            pointerEvents: "none",
                            zIndex: 0,
                          }}
                        />

                        {/* Foreground move art */}
                        <img
                          src={move.characterUrl}
                          alt={move.name}
                          style={{
                            display: "block",
                            width: "100%",
                            height: "auto",
                            borderRadius: 5,
                            position: "relative",
                            zIndex: 1,
                          }}
                        />
                      </div>
                      <br />

                      <Grid container align="space" justifyContent="center">
                        <Grid item xs={12} style={{}}>
                          {move.type.substring(0, 5) == "melee" ? (
                            <img
                              style={{
                                zIndex: 10,
                                width: 100,
                                minWidth: 50,
                                maxWidth: 60,
                                borderRadius: 5,
                                padding: 5,
                                display: "flex",
                                margin: "auto",
                              }}
                              src={"/dragonshorde/strength.svg"}
                            />
                          ) : null}
                          {move.type.substring(0, 6) == "ranged" ? (
                            <img
                              style={{
                                zIndex: 10,
                                width: 100,
                                minWidth: 50,
                                maxWidth: 60,
                                borderRadius: 5,
                                padding: 5,
                                display: "flex",
                                margin: "auto",
                              }}
                              src={"/dragonshorde/dexterity.svg"}
                            />
                          ) : null}
                          {move.type.substring(0, 5) == "magic" ? (
                            <img
                              style={{
                                zIndex: 10,
                                width: 100,
                                minWidth: 50,
                                maxWidth: 60,
                                borderRadius: 5,
                                padding: 5,
                                display: "flex",
                                margin: "auto",
                              }}
                              src={"/dragonshorde/intelligence.svg"}
                            />
                          ) : null}
                        </Grid>
                      </Grid>

                      <Typography
                        color="secondary"
                        align="center"
                        variant="subtitle1"
                      >
                        {" "}
                        {move.type}{" "}
                      </Typography>

                      <Grid
                        container
                        style={{ marginTop: 10, marginBottom: 10, padding: 10 }}
                      >
                        <Grid item xs={6}>
                          <img
                            style={{
                              zIndex: 10,
                              width: 100,
                              minWidth: 40,
                              maxWidth: 60,
                              borderRadius: 5,
                              display: "flex",
                              margin: "auto",
                              padding: 5,
                            }}
                            src={"/dragonshorde/power.svg"}
                          />
                          {move.type.substring(0, 5) == "melee" ? (
                            strengthAdj == 0 ? (
                              <Typography
                                color="secondary"
                                align="center"
                                variant="subtitle1"
                              >
                                {" "}
                                {Number(move.power + charObject.strength).toFixed(
                                  1
                                )}{" "}
                              </Typography>
                            ) : strengthAdj < 0 ? (
                              <Typography
                                color="secondary"
                                align="center"
                                variant="subtitle1"
                                style={{ color: "#F8575A" }}
                              >
                                {" "}
                                {Number(
                                  move.power +
                                    charObject.strength +
                                    strengthAdj
                                ).toFixed(1)}{" "}
                              </Typography>
                            ) : (
                              <Typography
                                color="secondary"
                                align="center"
                                variant="subtitle1"
                                style={{ color: "#4EC83E" }}
                              >
                                {" "}
                                {Number(
                                  move.power +
                                    charObject.strength +
                                    strengthAdj
                                ).toFixed(1)}{" "}
                              </Typography>
                            )
                          ) : null}
                          {move.type.substring(0, 6) == "ranged" ? (
                            dexterityAdj == 0 ? (
                              <Typography
                                color="secondary"
                                align="center"
                                variant="subtitle1"
                              >
                                {" "}
                                {Number(
                                  move.power + charObject.dexterity
                                ).toFixed(1)}{" "}
                              </Typography>
                            ) : dexterityAdj < 0 ? (
                              <Typography
                                color="secondary"
                                align="center"
                                variant="subtitle1"
                                style={{ color: "#F8575A" }}
                              >
                                {" "}
                                {Number(
                                  move.power +
                                    charObject.dexterity +
                                    dexterityAdj
                                ).toFixed(1)}{" "}
                              </Typography>
                            ) : (
                              <Typography
                                color="secondary"
                                align="center"
                                variant="subtitle1"
                                style={{ color: "#4EC83E" }}
                              >
                                {" "}
                                {Number(
                                  move.power +
                                    charObject.dexterity +
                                    dexterityAdj
                                ).toFixed(1)}{" "}
                              </Typography>
                            )
                          ) : null}
                          {move.type.substring(0, 5) == "magic" ? (
                            intelligenceAdj == 0 ? (
                              <Typography
                                color="secondary"
                                align="center"
                                variant="subtitle1"
                              >
                                {" "}
                                {Number(
                                  move.power + charObject.intelligence
                                ).toFixed(1)}{" "}
                              </Typography>
                            ) : intelligenceAdj < 0 ? (
                              <Typography
                                color="secondary"
                                align="center"
                                variant="subtitle1"
                                style={{ color: "#F8575A" }}
                              >
                                {" "}
                                {Number(
                                  move.power +
                                    charObject.intelligence +
                                    intelligenceAdj
                                ).toFixed(1)}{" "}
                              </Typography>
                            ) : (
                              <Typography
                                color="secondary"
                                align="center"
                                variant="subtitle1"
                                style={{ color: "#4EC83E" }}
                              >
                                {" "}
                                {Number(
                                  move.power +
                                    charObject.intelligence +
                                    intelligenceAdj
                                ).toFixed(1)}{" "}
                              </Typography>
                            )
                          ) : null}
                        </Grid>
                        <Grid item xs={6}>
                          <img
                            style={{
                              zIndex: 10,
                              width: 100,
                              minWidth: 40,
                              maxWidth: 60,
                              borderRadius: 5,
                              display: "flex",
                              margin: "auto",
                              padding: 5,
                            }}
                            src={"/dragonshorde/accuracy.svg"}
                          />
                          {accuracyAdj == 0 ? (
                            <Typography
                              color="secondary"
                              align="center"
                              variant="subtitle1"
                            >
                              {" "}
                              {Number(move.accuracy).toFixed(1)}{" "}
                            </Typography>
                          ) : accuracyAdj < 0 ? (
                            <Typography
                              color="secondary"
                              align="center"
                              variant="subtitle1"
                              style={{ color: "#F8575A" }}
                            >
                              {" "}
                              {Number(move.accuracy + accuracyAdj).toFixed(1)}{" "}
                            </Typography>
                          ) : (
                            <Typography
                              color="secondary"
                              align="center"
                              variant="subtitle1"
                              style={{ color: "#4EC83E" }}
                            >
                              {" "}
                              {Number(move.accuracy + accuracyAdj).toFixed(1)}{" "}
                            </Typography>
                          )}
                        </Grid>

                        <Grid item xs={12}>
                          <img
                            style={{
                              zIndex: 10,
                              width: 100,
                              minWidth: 40,
                              maxWidth: 60,
                              borderRadius: 5,
                              display: "flex",
                              margin: "auto",
                              padding: 5,
                            }}
                            src={"/dragonshorde/cooldown.png"}
                          />

                          {/* ===== CHANGED: show effective cooldown (not base cooldown) ===== */}
                          <Typography
                            color="secondary"
                            align="center"
                            variant="subtitle1"
                            style={{ color: effectiveCdColor }}
                          >
                            {Number(effectiveCooldown).toFixed(1)}
                          </Typography>
                        </Grid>
                      </Grid>

                      {move.effect == "none" ? null : move.type.substring(move.type.length - 5) ==
                          "curse" ||
                        move.type.substring(move.type.length - 4) ==
                          "buff" ? (
                        <Typography
                          color="secondary"
                          align="center"
                          variant="subtitle2"
                          style={{
                            margin: 10,
                            color: bonus > 0 ? "#4EC83E" : null,
                          }}
                        >
                          {" "}
                          Apply {(charObject[move.effect] + bonus) * 2}{" "}
                          {move.effect}{" "}
                        </Typography>
                      ) : (
                        <Typography
                          color="secondary"
                          align="center"
                          variant="subtitle2"
                          style={{
                            margin: 10,
                            color: bonus > 0 ? "#4EC83E" : null,
                          }}
                        >
                          {" "}
                          Apply{" "}
                          {Math.ceil((charObject[move.effect] + bonus) / 2)}{" "}
                          {move.effect}{" "}
                        </Typography>
                      )}

                      <Grid item xs={5}>
                        {move.effect == "bleed" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Bleed.svg"}
                          />
                        ) : null}
                        {move.effect == "bless" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Bless.svg"}
                          />
                        ) : null}
                        {move.effect == "burn" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Burn.svg"}
                          />
                        ) : null}
                        {move.effect == "cleanse" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Cleanse.svg"}
                          />
                        ) : null}
                        {move.effect == "doom" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Doom.svg"}
                          />
                        ) : null}
                        {move.effect == "drown" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Drown.svg"}
                          />
                        ) : null}
                        {move.effect == "empower" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Empower.svg"}
                          />
                        ) : null}
                        {move.effect == "focus" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Focus.svg"}
                          />
                        ) : null}
                        {move.effect == "freeze" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Freeze.svg"}
                          />
                        ) : null}
                        {move.effect == "hasten" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Hasten.svg"}
                          />
                        ) : null}
                        {move.effect == "nurture" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Nurture.svg"}
                          />
                        ) : null}
                        {move.effect == "paralyze" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Paralyze.svg"}
                          />
                        ) : null}
                        {move.effect == "poison" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Poison.svg"}
                          />
                        ) : null}
                        {move.effect == "shield" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Shield.svg"}
                          />
                        ) : null}
                        {move.effect == "slow" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Slow.svg"}
                          />
                        ) : null}
                        {move.effect == "strengthen" ? (
                          <img
                            style={{
                              zIndex: 10,
                              height: 100,
                              minHeight: 40,
                              maxHeight: 50,
                              borderRadius: 5,
                              padding: 5,
                            }}
                            src={"/dragonshorde/trees/Strengthen.svg"}
                          />
                        ) : null}
                      </Grid>

                      <Typography
                        color="secondary"
                        align="center"
                        variant="subtitle2"
                        style={{ margin: 10 }}
                      >
                        {" "}
                        {move.description}{" "}
                      </Typography>

                      <br />
                    </Grid>
                  );
                } else {
                  return <div key={index}></div>;
                }
              })
            : null}
        </Grid>

        <br />
        <br />
        <Typography
          color="secondary"
          align="center"
          variant="h4"
          style={{ fontFamily: "Jacques", margin: 20 }}
        >
          {" "}
          Skill Tree{" "}
        </Typography>

        <br />
        <br />
        <Grid container>
          {trees.map((treeNode, index) => {
            return (
              <Grid key={index} item xs={3} sm={12 / 8} md={6 / 8}>
                <Button
                  style={{ width: "5%" }}
                  onClick={() =>
                    treeNode == tree ? setTree(null) : setTree(treeNode)
                  }
                >
                  <img
                    src={"/dragonshorde/trees/" + treeNode.skill1.title + ".svg"}
                    style={{ width: "100%" }}
                  />
                </Button>
              </Grid>
            );
          })}
        </Grid>

        <br />
        <br />

        {tree ? (
          <Grid container>
            <Grid item xs={12} sm={12}>
              <img
                src={"/dragonshorde/trees/" + tree.skill1.title + ".svg"}
                style={{ width: "20%", display: "flex", margin: "auto" }}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ marginTop: 10, paddingLeft: 30, paddingRight: 30 }}
              >
                {" "}
                {tree.skill1.title} Practice{" "}
              </Typography>
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{
                  display: "grid",
                  margin: "auto",
                  textTransform: "none",
                  paddingLeft: 30,
                  paddingRight: 30,
                }}
              >
                {" "}
                {tree.skill1.effect}{" "}
              </Typography>
              <Button
                style={{ display: "flex", margin: "auto" }}
                onClick={() =>
                  assignPoints(tree.skill1.byte, "plus", tree.skill1.maxLevel, 0)
                }
              >
                <AddIcon style={{ color: "#FFFFFF" }} />
              </Button>
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ display: "grid", margin: "auto" }}
              >
                {" "}
                {points[tree.skill1.byte]} / {tree.skill1.maxLevel}{" "}
              </Typography>
              <Button
                style={{ display: "flex", margin: "auto" }}
                onClick={() =>
                  assignPoints(
                    tree.skill1.byte,
                    "minus",
                    tree.skill1.maxLevel,
                    0
                  )
                }
              >
                <RemoveIcon style={{ color: "#FFFFFF" }} />
              </Button>
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{
                  display: "grid",
                  margin: "auto",
                  paddingLeft: 30,
                  paddingRight: 30,
                }}
              >
                {" "}
                {incrementNumbers(tree.skill1.effect, tree.skill1.byte)}{" "}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={6}>
              <img
                src={
                  "/dragonshorde/trees/tier1/" + tree.skill2.title + ".svg"
                }
                style={{ height: 100, display: "flex", margin: "auto" }}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ marginTop: 10, paddingLeft: 30, paddingRight: 30 }}
              >
                {" "}
                {tree.skill2.title}{" "}
              </Typography>
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{
                  display: "grid",
                  margin: "auto",
                  textTransform: "none",
                  paddingLeft: 30,
                  paddingRight: 30,
                }}
              >
                {" "}
                {tree.skill2.effect}{" "}
              </Typography>
              <Button
                style={{ display: "flex", margin: "auto" }}
                onClick={() =>
                  assignPoints(tree.skill2.byte, "plus", tree.skill2.maxLevel, 1)
                }
              >
                <AddIcon style={{ color: "#FFFFFF" }} />
              </Button>
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ display: "grid", margin: "auto" }}
              >
                {" "}
                {points[tree.skill2.byte]} / {tree.skill2.maxLevel}{" "}
              </Typography>
              <Button
                style={{ display: "flex", margin: "auto" }}
                onClick={() =>
                  assignPoints(
                    tree.skill2.byte,
                    "minus",
                    tree.skill2.maxLevel,
                    1
                  )
                }
              >
                <RemoveIcon style={{ color: "#FFFFFF" }} />
              </Button>
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{
                  display: "grid",
                  margin: "auto",
                  paddingLeft: 30,
                  paddingRight: 30,
                }}
              >
                {" "}
                {incrementNumbers(tree.skill2.effect, tree.skill2.byte)}{" "}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={6}>
              <img
                src={
                  "/dragonshorde/trees/tier1/" + tree.skill3.title + ".svg"
                }
                style={{ height: 100, display: "flex", margin: "auto" }}
              />
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ marginTop: 10, paddingLeft: 30, paddingRight: 30 }}
              >
                {" "}
                {tree.skill3.title}{" "}
              </Typography>
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{
                  display: "grid",
                  margin: "auto",
                  textTransform: "none",
                  paddingLeft: 30,
                  paddingRight: 30,
                }}
              >
                {" "}
                {tree.skill3.effect}{" "}
              </Typography>
              <Button
                style={{ display: "flex", margin: "auto" }}
                onClick={() =>
                  assignPoints(tree.skill3.byte, "plus", tree.skill3.maxLevel, 1)
                }
              >
                <AddIcon style={{ color: "#FFFFFF" }} />
              </Button>
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{ display: "grid", margin: "auto" }}
              >
                {" "}
                {points[tree.skill3.byte]} / {tree.skill3.maxLevel}{" "}
              </Typography>
              <Button
                style={{ display: "flex", margin: "auto" }}
                onClick={() =>
                  assignPoints(
                    tree.skill3.byte,
                    "minus",
                    tree.skill3.maxLevel,
                    1
                  )
                }
              >
                <RemoveIcon style={{ color: "#FFFFFF" }} />
              </Button>
              <Typography
                color="secondary"
                align="center"
                variant="subtitle1"
                style={{
                  display: "grid",
                  margin: "auto",
                  paddingLeft: 30,
                  paddingRight: 30,
                }}
              >
                {" "}
                {incrementNumbers(tree.skill3.effect, tree.skill3.byte)}{" "}
              </Typography>
            </Grid>
          </Grid>
        ) : null}

        <br />
        <br />
        <br />
        {!arraysEqual(points, oldPoints) ? (
          <Button
            variant="contained"
            color="secondary"
            style={{ display: "flex", margin: "auto" }}
            onClick={() => applyPoints()}
          >
            <Typography
              color="primary"
              align="center"
              variant="subtitle1"
              style={{ display: "grid", margin: "auto" }}
            >
              {" "}
              Apply{" "}
            </Typography>
          </Button>
        ) : null}

        <br />
        <br />
        <br />
      </div>
    );
  }

  return null;
}
