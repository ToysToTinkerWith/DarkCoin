from pyteal import *


def approval_program():
    
    handle_creation = Return(Int(1))

    listAsset = Seq(
        Assert(Gtxn[Minus(Txn.group_index(), Int(2))].receiver() == Global.current_application_address()),
        Assert(Gtxn[Minus(Txn.group_index(), Int(2))].amount() == Int(100000)),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].xfer_asset() == Txn.assets[0]),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].asset_receiver() == Global.current_application_address()),
        box := App.box_get(Concat(Itob(Txn.assets[0]), Itob(Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount()), Txn.application_args[1], Txn.application_args[2], Txn.sender())),
        Assert(Not(box.hasValue())),
        App.box_put(Concat(Itob(Txn.assets[0]), Itob(Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount()), Txn.application_args[1], Txn.application_args[2], Txn.sender()), Txn.sender()),
        Int(1)
    )

    buyAsset = Seq(
        Assert(Btoi(Txn.application_args[3]) <= Btoi(Txn.application_args[1])),
        If(Txn.assets[1] == Int(0),
           Seq(
                Assert(Gtxn[Minus(Txn.group_index(), Int(1))].receiver() == Txn.accounts[1]),
                Assert(Gtxn[Minus(Txn.group_index(), Int(1))].amount() == Mul(Btoi(Txn.application_args[2]), Btoi(Txn.application_args[3]))),
           ),
           Seq(
                Assert(Gtxn[Minus(Txn.group_index(), Int(1))].xfer_asset() == Txn.assets[1]),
                Assert(Gtxn[Minus(Txn.group_index(), Int(1))].asset_receiver() == Txn.accounts[1]),
                Assert(Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount() == Mul(Btoi(Txn.application_args[2]), Btoi(Txn.application_args[3]))),
           )
        ),
        box := App.box_get(Concat(Itob(Txn.assets[0]), Txn.application_args[1], Itob(Txn.assets[1]), Txn.application_args[2], Txn.accounts[1])),
        Assert(box.hasValue()),
        Assert(App.box_delete(Concat(Itob(Txn.assets[0]), Txn.application_args[1], Itob(Txn.assets[1]), Txn.application_args[2], Txn.accounts[1]))),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Btoi(Txn.application_args[3]),
        }),
        InnerTxnBuilder.Submit(),
        If(Minus(Btoi(Txn.application_args[1]), Btoi(Txn.application_args[3])) > Int(0),
           App.box_put(Concat(Itob(Txn.assets[0]), Itob(Minus(Btoi(Txn.application_args[1]), Btoi(Txn.application_args[3]))), Itob(Txn.assets[1]), Txn.application_args[2], Txn.accounts[1]), Txn.accounts[1])
        ),
        Int(1)
    )

    removeListing = Seq(
        box := App.box_get(Concat(Itob(Txn.assets[0]), Txn.application_args[1], Txn.application_args[2], Txn.application_args[3], Txn.sender())),
        Assert(box.hasValue()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Btoi(Txn.application_args[1]),
        }),
        InnerTxnBuilder.Submit(),
        Assert(App.box_delete(Concat(Itob(Txn.assets[0]), Txn.application_args[1], Txn.application_args[2], Txn.application_args[3], Txn.sender()))),
        Int(1)
    )
   
    handle_optin = Return(Int(1))
    
    # only the creator can closeout the contract
    handle_closeout = Return(Int(1))

    # nobody can update the contract
    handle_updateapp =  Return(Txn.sender() == Global.creator_address())

    # only creator can delete the contract
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())

    optin = Seq(
        Assert(Gtxn[Add(Txn.group_index(), Int(1))].receiver() == Global.current_application_address()),
        Assert(Gtxn[Add(Txn.group_index(), Int(1))].amount() == Int(100000)),
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
        [Txn.application_args[0] == Bytes("optin"), Return(optin)],
        [Txn.application_args[0] == Bytes("listAsset"), Return(listAsset)],
        [Txn.application_args[0] == Bytes("buyAsset"), Return(buyAsset)],
        [Txn.application_args[0] == Bytes("removeListing"), Return(removeListing)],

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