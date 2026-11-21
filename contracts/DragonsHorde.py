from pyteal import *


def approval_program():
    
    handle_creation = Return(Int(1))

    joinBrawl = Seq(
        Assert(Gtxn[0].xfer_asset() == Int(1088771340)),
        Assert(Gtxn[0].asset_receiver() == Addr("ZATKR4UKC6II7CGXVV4GOSEQLMVY72DBSEY5X4MMKQRT5SOPN3JZA6RWPA")),
        Assert(Gtxn[0].asset_amount() == Int(1000000000)),
        Assert(Gtxn[1].xfer_asset() == Int(1088771340)),
        Assert(Gtxn[1].asset_receiver() == Global.current_application_address()),
        Assert(Gtxn[1].asset_amount() == Int(9000000000)),
        dragon := App.box_get(Bytes("dragon")),
        Assert(Not(dragon.hasValue())),
        senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[0]),
        assetCreator := AssetParam.creator(Txn.assets[0]),
        Assert(senderAssetBalance.value() == Int(1)),
        Assert(assetCreator.value() == Addr("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY")),
        box := App.box_get(Itob(Txn.assets[0])),
        Assert(box.hasValue()),
        App.box_put(Concat(Itob(Txn.assets[0]), Bytes("current")), box.value()),
        Int(1)
    )

    updateCharacter = Seq(
        Assert(Int(0)),
        senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[0]),
        Assert(senderAssetBalance.value() == Int(1)),
        Assert(Gtxn[Txn.group_index() + Int(1)].sender() == Addr("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY")),
        box := App.box_get(Itob(Txn.assets[0])),
        If(box.hasValue(), Assert(App.box_delete(Itob(Txn.assets[0])))),
        App.box_put(Itob(Txn.assets[0]), Txn.application_args[1]),
        Int(1)
    )

    updateCurrentCharacter = Seq(
        Assert(Txn.sender() == Addr("6MKO3DYEPCVSPEGQNHQPAUUZ7NMVQRRADBTIRVQZHBGVCKHZVRWA46SJ54")),
        box := App.box_get(Concat(Itob(Txn.assets[0]), Bytes("current"))),
        If(box.hasValue(), Assert(App.box_delete(Concat(Itob(Txn.assets[0]), Bytes("current"))))),
        App.box_put(Concat(Itob(Txn.assets[0]), Bytes("current")), Txn.application_args[1]),
        Int(1)
    )

    deleteCharacter = Seq(
        
        box := App.box_get(Itob(Txn.assets[0])),
        If(box.hasValue(), Assert(App.box_delete(Itob(Txn.assets[0])))),
        boxCurrent := App.box_get(Concat(Itob(Txn.assets[0]), Bytes("current"))),
        If(boxCurrent.hasValue(), Assert(App.box_delete(Concat(Itob(Txn.assets[0]), Bytes("current"))))),
        Int(1)
    )

    deleteCurrentCharacter = Seq(
        Assert(Or(Txn.sender() == Addr("6MKO3DYEPCVSPEGQNHQPAUUZ7NMVQRRADBTIRVQZHBGVCKHZVRWA46SJ54"), Txn.sender() == Addr("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ"))),
        box := App.box_get(Concat(Itob(Txn.assets[0]), Bytes("current"))),
        If(box.hasValue(), Assert(App.box_delete(Concat(Itob(Txn.assets[0]), Bytes("current"))))),
        Int(1)
    )

    updateDragon = Seq(
        Assert(Txn.sender() == Addr("6MKO3DYEPCVSPEGQNHQPAUUZ7NMVQRRADBTIRVQZHBGVCKHZVRWA46SJ54")),
        dragon := App.box_get(Bytes("dragon")),
        If(dragon.hasValue(), Assert(App.box_delete(Bytes("dragon")))),
        App.box_put(Bytes("dragon"), Txn.application_args[1]),
        Int(1)
    )

    deleteDragon = Seq(
        Assert(Txn.sender() == Addr("6MKO3DYEPCVSPEGQNHQPAUUZ7NMVQRRADBTIRVQZHBGVCKHZVRWA46SJ54")),
        dragon := App.box_get(Bytes("dragon")),
        If(dragon.hasValue(), Assert(App.box_delete(Bytes("dragon")))),
        Int(1)
    )

    attack = Seq(
        senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[0]),
        assetCreator := AssetParam.creator(Txn.assets[0]),
        Assert(senderAssetBalance.value() == Int(1)),
        Assert(assetCreator.value() == Addr("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY")),
        attackBox := App.box_get(Concat(Itob(Txn.assets[0]), Bytes("action"))),
        If(attackBox.hasValue(),
           Assert(App.box_delete(Concat(Itob(Txn.assets[0]), Bytes("action"))))
        ),
        App.box_put(Concat(Itob(Txn.assets[0]), Bytes("action")), Txn.application_args[1]),
        Int(1)
    )

    deleteAttack = Seq(
        Assert(Txn.sender() == Addr("6MKO3DYEPCVSPEGQNHQPAUUZ7NMVQRRADBTIRVQZHBGVCKHZVRWA46SJ54")),
        move := App.box_get(Concat(Itob(Txn.assets[0]), Bytes("action"))),
        If(move.hasValue(), Assert(App.box_delete(Concat(Itob(Txn.assets[0]), Bytes("action"))))),
        Int(1)
    )

    reward = Seq(
        Assert(Txn.sender() == Addr("6MKO3DYEPCVSPEGQNHQPAUUZ7NMVQRRADBTIRVQZHBGVCKHZVRWA46SJ54")),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.accounts[1],
            TxnField.asset_amount: Btoi(Txn.application_args[1]),
        }),
        InnerTxnBuilder.Submit(),
        Int(1)
    )

    grantXp = Seq(
        Assert(Txn.sender() == Addr("6MKO3DYEPCVSPEGQNHQPAUUZ7NMVQRRADBTIRVQZHBGVCKHZVRWA46SJ54")),
        xp := App.box_get(Concat(Itob(Txn.assets[0]), Bytes("xp"))),
        If(Not(xp.hasValue()),
            App.box_put(Concat(Itob(Txn.assets[0]), Bytes("xp")), Txn.application_args[1]),
            Seq(
                Assert(App.box_delete(Concat(Itob(Txn.assets[0]), Bytes("xp")))),
                App.box_put(Concat(Itob(Txn.assets[0]), Bytes("xp")), Itob(Add(Btoi(Txn.application_args[1]), Btoi(xp.value())))),
            )
        ),
        Int(1)
    )

    applyPoints = Seq(
        senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[0]),
        assetCreator := AssetParam.creator(Txn.assets[0]),
        Assert(senderAssetBalance.value() == Int(1)),
        Assert(assetCreator.value() == Addr("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY")),        
        points := App.box_get(Concat(Itob(Txn.assets[0]), Bytes("points"))),
        If(Not(points.hasValue()),
            App.box_put(Concat(Itob(Txn.assets[0]), Bytes("points")), Txn.application_args[1]),
            Seq(
                Assert(App.box_delete(Concat(Itob(Txn.assets[0]), Bytes("points")))),
                App.box_put(Concat(Itob(Txn.assets[0]), Bytes("points")), Txn.application_args[1]),
            )
        ),
        Int(1)
    )

    pointsPart = Seq(
        Assert(Global.group_size() == Int(2)),
        Assert(Txn.group_index() == Int(0)),
        Assert(Len(Txn.application_args[1]) > Int(0)),
        Int(1)
    )

    applyPointsGrouped = Seq(
        Assert(Global.group_size() == Int(2)),
        Assert(Txn.group_index() == Int(1)),
        Assert(Gtxn[0].type_enum() == TxnType.ApplicationCall),
        Assert(Gtxn[0].application_id() == Global.current_application_id()),
        Assert(Gtxn[0].on_completion() == OnComplete.NoOp),
        Assert(Gtxn[0].sender() == Txn.sender()),
        Assert(Gtxn[0].application_args[0] == Bytes("pointsPart")),
        Assert(Len(Gtxn[0].application_args[1]) > Int(0)),
        Assert(Len(Txn.application_args[1]) > Int(0)),
        senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[0]),
        assetCreator := AssetParam.creator(Txn.assets[0]),
        Assert(senderAssetBalance.value() == Int(1)),
        Assert(assetCreator.value() == Addr("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY")),
        groupedPoints := App.box_get(Concat(Itob(Txn.assets[0]), Bytes("points"))),
        If(Not(groupedPoints.hasValue()),
            App.box_put(
                Concat(Itob(Txn.assets[0]), Bytes("points")),
                Concat(Gtxn[0].application_args[1], Txn.application_args[1])
            ),
            Seq(
                Assert(App.box_delete(Concat(Itob(Txn.assets[0]), Bytes("points")))),
                App.box_put(
                    Concat(Itob(Txn.assets[0]), Bytes("points")),
                    Concat(Gtxn[0].application_args[1], Txn.application_args[1])
                ),
            )
        ),
        Int(1)
    )
   
    handle_optin = Return(Int(1))
    
    # only the creator can closeout the contract
    handle_closeout = Return(Int(1))

    # nobody can update the contract
    handle_updateapp =  Return(Txn.sender() == Global.creator_address())

    # only creator can delete the contract
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())

    opt_in = Seq(
        Assert(Txn.sender() == Global.creator_address()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        Int(1)
    )


    # handle the types of application calls
    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.application_args[0] == Bytes("optin"), Return(opt_in)],
        [Txn.application_args[0] == Bytes("joinBrawl"), Return(joinBrawl)],
        [Txn.application_args[0] == Bytes("updateCurrentCharacter"), Return(updateCurrentCharacter)],
        [Txn.application_args[0] == Bytes("deleteCurrentCharacter"), Return(deleteCurrentCharacter)],
        [Txn.application_args[0] == Bytes("updateCharacter"), Return(updateCharacter)],
        [Txn.application_args[0] == Bytes("deleteCharacter"), Return(deleteCharacter)],
        [Txn.application_args[0] == Bytes("updateDragon"), Return(updateDragon)],
        [Txn.application_args[0] == Bytes("deleteDragon"), Return(deleteDragon)],
        [Txn.application_args[0] == Bytes("attack"), Return(attack)],
        [Txn.application_args[0] == Bytes("deleteAttack"), Return(deleteAttack)],
        [Txn.application_args[0] == Bytes("reward"), Return(reward)],
        [Txn.application_args[0] == Bytes("grantXp"), Return(grantXp)],
        [Txn.application_args[0] == Bytes("applyPoints"), Return(applyPoints)],
        [Txn.application_args[0] == Bytes("pointsPart"), Return(pointsPart)],
        [Txn.application_args[0] == Bytes("applyPointsGrouped"), Return(applyPointsGrouped)]




    )
    
    return program

# let clear state happen
def clear_state_program():
    program = Return(Int(1))
    return program
    


if __name__ == "__main__":
    with open("vote_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=8)
        f.write(compiled)

    with open("vote_clear_state.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
        f.write(compiled)
