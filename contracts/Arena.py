from pyteal import *

# -----------------------------
# Constants
# -----------------------------
DARK_ID = Int(1088771340)
DARK_REWARD = Int(20000000000)

FIGHT_ASA_ID = Int(1088771340)
FIGHT_PAYMENT_RECEIVER = Addr("VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM")
FIGHT_NFT_CREATOR = Addr("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY")

ITEM_TOKEN_CREATOR = Addr("3SKDMKVJQD7RR62DMOIXVK3CQQWSFXAM2JXMIRDOPLIW4MWWPBWYV3NZ3Y")
DAO_NFT_CREATOR = Addr("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")

DAO_NAME_PREFIX = Bytes("Dark Coin DAO")

BOX_SIZE = Int(8000)
EFFECT_STRIDE = Int(2000)
MAX_EFFECTS = Int(4)


@Subroutine(TealType.uint64)
def is_digit(ch):
    return And(ch >= Int(48), ch <= Int(57))


@Subroutine(TealType.uint64)
def digit_value(ch):
    return Seq(
        Assert(is_digit(ch)),
        ch - Int(48),
    )


@Subroutine(TealType.uint64)
def trailing_number(a):
    i = ScratchVar(TealType.uint64)
    cur = ScratchVar(TealType.uint64)
    found_any_digit = ScratchVar(TealType.uint64)
    in_digit_run = ScratchVar(TealType.uint64)
    value = ScratchVar(TealType.uint64)

    return Seq(
        Assert(Len(a) > Int(0)),
        i.store(Int(0)),
        found_any_digit.store(Int(0)),
        in_digit_run.store(Int(0)),
        value.store(Int(0)),
        While(i.load() < Len(a)).Do(
            Seq(
                cur.store(GetByte(a, i.load())),
                If(is_digit(cur.load())).Then(
                    Seq(
                        If(in_digit_run.load() == Int(0)).Then(
                            Seq(
                                value.store(Int(0)),
                                in_digit_run.store(Int(1)),
                            )
                        ),
                        value.store(value.load() * Int(10) + (cur.load() - Int(48))),
                        found_any_digit.store(Int(1)),
                    )
                ).Else(
                    in_digit_run.store(Int(0))
                ),
                i.store(i.load() + Int(1)),
            )
        ),
        Assert(found_any_digit.load() == Int(1)),
        value.load(),
    )


def approval_program():
    handle_creation = Return(Int(1))
    handle_optin = Return(Int(1))
    handle_closeout = Return(Int(1))
    handle_updateapp = Return(Txn.sender() == Global.creator_address())
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())

    opt_in_asa = Seq(
        Assert(Txn.sender() == Global.creator_address()),
        Assert(Txn.assets.length() >= Int(1)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[0],
                TxnField.asset_receiver: Global.current_application_address(),
                TxnField.asset_amount: Int(0),
            }
        ),
        InnerTxnBuilder.Submit(),
        Int(1),
    )

    sender_asset_balance = AssetHolding.balance(Txn.sender(), Txn.assets[0])
    asset_creator = AssetParam.creator(Txn.assets[0])

    start_fight = Seq(
        Assert(Txn.assets.length() >= Int(1)),
        sender_asset_balance,
        Assert(sender_asset_balance.hasValue()),
        Assert(sender_asset_balance.value() == Int(1)),
        asset_creator,
        Assert(asset_creator.hasValue()),
        Assert(asset_creator.value() == FIGHT_NFT_CREATOR),
        If(
            App.globalGet(Itob(Txn.assets[0])) != Int(0),
            Int(0),
            Seq(
                Assert(Txn.group_index() >= Int(2)),
                Assert(Gtxn[Txn.group_index() - Int(2)].sender() == Txn.sender()),
                Assert(Gtxn[Txn.group_index() - Int(2)].type_enum() == TxnType.AssetTransfer),
                Assert(Gtxn[Txn.group_index() - Int(2)].xfer_asset() == FIGHT_ASA_ID),
                Assert(Gtxn[Txn.group_index() - Int(2)].asset_amount() >= Int(10000000000)),
                Assert(Gtxn[Txn.group_index() - Int(2)].asset_receiver() == Global.current_application_address()),
                Assert(Gtxn[Txn.group_index() - Int(1)].sender() == Txn.sender()),
                Assert(Gtxn[Txn.group_index() - Int(1)].type_enum() == TxnType.Payment),
                Assert(Gtxn[Txn.group_index() - Int(1)].amount() == Int(100000)),
                Assert(Gtxn[Txn.group_index() - Int(1)].receiver() == FIGHT_PAYMENT_RECEIVER),
                App.globalPut(Itob(Txn.assets[0]), Gtxn[Txn.group_index() - Int(2)].asset_amount()),
                Int(1),
            ),
        ),
    )


    reward = Seq(
        # prevent anyone from draining contract funds
        Assert(Txn.sender() == Addr("6MKO3DYEPCVSPEGQNHQPAUUZ7NMVQRRADBTIRVQZHBGVCKHZVRWA46SJ54")),

        # Expect winner + loser asset IDs passed via Txn.assets
        Assert(Txn.assets.length() == Int(3)),

        # (Optional but nice) Ensure these keys actually exist before delete
        # You can omit these two Asserts if you want soft-delete behavior
        Assert(Txn.assets[0] != Txn.assets[1]),
        Assert(App.globalGet(Itob(Txn.assets[0])) > Int(0)),
        Assert(App.globalGet(Itob(Txn.assets[1])) > Int(0)),

        # Ensure accounts[1] holds exactly 1 of the winner asset
        winnerBal := AssetHolding.balance(Txn.accounts[1], Txn.assets[0]),
        Assert(winnerBal.hasValue()),
        Assert(winnerBal.value() == Int(1)),

        # Pay reward
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: DARK_ID,
            TxnField.asset_receiver: Txn.accounts[1],
            TxnField.asset_amount: DARK_REWARD,
        }),
        InnerTxnBuilder.Submit(),

        # Delete both winner + loser from global state
        App.globalDel(Itob(Txn.assets[0])),
        App.globalDel(Itob(Txn.assets[1])),

        Int(1)
    )

    GROUP_DARK_REWARD = Int(40000000000) # or 40000 * 10**decimals if DARK has decimals

    reward4 = Seq(
        Assert(Txn.sender() == Addr("6MKO3DYEPCVSPEGQNHQPAUUZ7NMVQRRADBTIRVQZHBGVCKHZVRWA46SJ54")),

        # winner + 3 losers + DARK asset
        Assert(Txn.assets.length() == Int(5)),

        Assert(Txn.assets[0] != Txn.assets[1]),
        Assert(Txn.assets[0] != Txn.assets[2]),
        Assert(Txn.assets[0] != Txn.assets[3]),
        Assert(Txn.assets[1] != Txn.assets[2]),
        Assert(Txn.assets[1] != Txn.assets[3]),
        Assert(Txn.assets[2] != Txn.assets[3]),

        Assert(App.globalGet(Itob(Txn.assets[0])) > Int(0)),
        Assert(App.globalGet(Itob(Txn.assets[1])) > Int(0)),
        Assert(App.globalGet(Itob(Txn.assets[2])) > Int(0)),
        Assert(App.globalGet(Itob(Txn.assets[3])) > Int(0)),

        winnerBal := AssetHolding.balance(Txn.accounts[1], Txn.assets[0]),
        Assert(winnerBal.hasValue()),
        Assert(winnerBal.value() == Int(1)),

        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: DARK_ID,
            TxnField.asset_receiver: Txn.accounts[1],
            TxnField.asset_amount: GROUP_DARK_REWARD,
        }),
        InnerTxnBuilder.Submit(),

        App.globalDel(Itob(Txn.assets[0])),
        App.globalDel(Itob(Txn.assets[1])),
        App.globalDel(Itob(Txn.assets[2])),
        App.globalDel(Itob(Txn.assets[3])),

        Int(1)
    )

    # -----------------------------
    # itemVote
    #
    # Supports:
    # 1) token vote:
    #    app args: ["itemVote", vote_byte, effect_index]
    #    Txn.assets[0] = item token
    #    Txn.assets[1..] = DAO NFTs
    #
    # 2) skin vote:
    #    app args: ["itemVote", vote_byte, effect_index, skin_name]
    #    Txn.assets[0..] = DAO NFTs
    # -----------------------------
    i = ScratchVar(TealType.uint64)

    item_creator = AssetParam.creator(Txn.assets[0])
    item_name = AssetParam.name(Txn.assets[0])

    dao_creator = AssetParam.creator(Txn.assets[i.load()])
    dao_name = AssetParam.name(Txn.assets[i.load()])
    dao_unit_name = AssetParam.unitName(Txn.assets[i.load()])
    dao_balance = AssetHolding.balance(Txn.sender(), Txn.assets[i.load()])

    suffix_num = ScratchVar(TealType.uint64)
    effect_index = ScratchVar(TealType.uint64)
    box_offset = ScratchVar(TealType.uint64)

    box_name = ScratchVar(TealType.bytes)
    dao_start_index = ScratchVar(TealType.uint64)

    item_vote = Seq(
        Assert(Txn.application_args.length() >= Int(3)),
        Assert(Txn.assets.length() >= Int(1)),
        Assert(Len(Txn.application_args[1]) == Int(1)),

        Assert(Len(Txn.application_args[2]) == Int(1)),
        Assert(GetByte(Txn.application_args[2], Int(0)) >= Int(48)),
        Assert(GetByte(Txn.application_args[2], Int(0)) <= Int(51)),
        effect_index.store(GetByte(Txn.application_args[2], Int(0)) - Int(48)),
        Assert(effect_index.load() < MAX_EFFECTS),

        item_creator,
        If(
            And(
                Txn.assets.length() >= Int(2),
                item_creator.hasValue(),
                item_creator.value() == ITEM_TOKEN_CREATOR,
            )
        ).Then(
            Seq(
                item_name,
                Assert(item_name.hasValue()),
                Assert(Len(item_name.value()) > Int(0)),
                box_name.store(item_name.value()),
                dao_start_index.store(Int(1)),
            )
        ).Else(
            Seq(
                # skin vote path:
                # item name is passed explicitly as arg 3
                Assert(Txn.application_args.length() >= Int(4)),
                Assert(Len(Txn.application_args[3]) > Int(0)),
                box_name.store(Txn.application_args[3]),
                dao_start_index.store(Int(0)),
            )
        ),

        existing_box := App.box_length(box_name.load()),
        If(
            Not(existing_box.hasValue()),
            Assert(App.box_create(box_name.load(), BOX_SIZE)),
        ),

        i.store(dao_start_index.load()),
        While(i.load() < Txn.assets.length()).Do(
            Seq(
                dao_balance,
                Assert(dao_balance.hasValue()),
                Assert(dao_balance.value() > Int(0)),

                dao_creator,
                Assert(dao_creator.hasValue()),
                Assert(dao_creator.value() == DAO_NFT_CREATOR),

                dao_name,
                Assert(dao_name.hasValue()),
                Assert(Len(dao_name.value()) >= Len(DAO_NAME_PREFIX)),
                Assert(
                    Extract(
                        dao_name.value(),
                        Int(0),
                        Len(DAO_NAME_PREFIX),
                    ) == DAO_NAME_PREFIX
                ),

                dao_unit_name,
                Assert(dao_unit_name.hasValue()),
                Assert(Len(dao_unit_name.value()) > Int(0)),

                suffix_num.store(trailing_number(dao_unit_name.value())),
                Assert(suffix_num.load() < EFFECT_STRIDE),

                box_offset.store(
                    suffix_num.load() + (effect_index.load() * EFFECT_STRIDE)
                ),
                Assert(box_offset.load() < BOX_SIZE),

                App.box_replace(
                    box_name.load(),
                    box_offset.load(),
                    Txn.application_args[1],
                ),

                i.store(i.load() + Int(1)),
            )
        ),
        Int(1),
    )

    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.application_args[0] == Bytes("optin"), Return(opt_in_asa)],
        [Txn.application_args[0] == Bytes("startFight"), Return(start_fight)],
        [Txn.application_args[0] == Bytes("reward"), Return(reward)],
        [Txn.application_args[0] == Bytes("reward4"), Return(reward4)],

        [Txn.application_args[0] == Bytes("itemVote"), Return(item_vote)],
    )

    return program


def clear_state_program():
    return Return(Int(1))


if __name__ == "__main__":
    with open("vote_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=8)
        f.write(compiled)

    with open("vote_clear_state.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
        f.write(compiled)
