from pyteal import *


def approval_program():
    
    handle_creation = Return(Int(1))

    startBattle = Seq(
        Assert(Gtxn[0].xfer_asset() == Int(1088771340)),
        Assert(Gtxn[0].asset_receiver() == Global.current_application_address()),
        Assert(Gtxn[0].asset_amount() >= Int(10000000000)),
        Assert(Gtxn[0].asset_amount() <= Int(100000000000)),
        fighter := App.box_get(Itob(Txn.assets[0])),
        Assert(Not(fighter.hasValue())),
        App.box_put(Itob(Txn.assets[0]), Bytes("blank")),
        senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[0]),
        Assert(senderAssetBalance.value() == Int(1)),
        assetCreator := AssetParam.creator(Txn.assets[0]),
        Assert(assetCreator.value() == Addr("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY")),
        App.box_put(Concat(Itob(Txn.assets[0]), Itob(Gtxn[0].asset_amount()))),
        Int(1)
    )

    joinBattle = Seq(
        battle := App.box.get(Concat(Itob(Txn.assets[1]), Itob(Gtxn[0].asset_amount()))),
        Assert(battle.hasValue()),
        Assert(Gtxn[0].xfer_asset() == Int(1088771340)),
        Assert(Gtxn[0].asset_receiver() == Global.current_application_address()),
        Assert(Gtxn[0].asset_amount() >= Int(10000000000)),
        Assert(Gtxn[0].asset_amount() <= Int(100000000000)),
        fighter := App.box_get(Itob(Txn.assets[0])),
        Assert(Not(fighter.hasValue())),
        App.box_put(Itob(Txn.assets[0]), Bytes("blank")),
        senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[0]),
        Assert(senderAssetBalance.value() == Int(1)),
        assetCreator := AssetParam.creator(Txn.assets[0]),
        Assert(assetCreator.value() == Addr("L6VIKAHGH4D7XNH3CYCWKWWOHYPS3WYQM6HMIPNBVSYZWPNQ6OTS5VERQY")),
        App.box_put(Concat(Itob(Txn.assets[1]), Bytes("battle"), Itob(Txn.assets[0]), Itob(Gtxn[0].asset_amount())), Itob(Txn.first_valid_time())),
        App.box_delete(Concat(Itob(Txn.assets[1]), Itob(Gtxn[0].asset_amount()))),
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

    updateChararacter = Seq(
        Assert(Txn.sender() == Addr("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM")),
        box := App.box_get(Itob(Txn.assets[0])),
        If(box.hasValue(), Assert(App.box_delete(Itob(Txn.assets[0])))),
        App.box_put(Itob(Txn.assets[0]), Txn.application_args[1]),
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
        [Txn.application_args[0] == Bytes("startBattle"), Return(startBattle)],
        [Txn.application_args[0] == Bytes("joinBattle"), Return(joinBattle)],
        [Txn.application_args[0] == Bytes("attack"), Return(attack)],
        [Txn.application_args[0] == Bytes("updateChararacter"), Return(updateChararacter)],

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