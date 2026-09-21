from pyteal import *


def approval_program():
    
    # don't need any real fancy initialization
    handle_creation = Return(Int(1))

    addboxNFT = Seq(
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].asset_receiver() == Global.current_application_address()),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].xfer_asset() == Txn.assets[0]),
        contents := App.box_get(Concat(Txn.accounts[1], Itob(Txn.assets[0]))),
        If(contents.hasValue(),
            Seq(
                Assert(App.box_delete(Concat(Txn.accounts[1], Itob(Txn.assets[0])))),
                App.box_put(Concat(Txn.accounts[1], Itob(Txn.assets[0])), Itob(Add(Btoi(contents.value()), Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount())))
            ),
            App.box_put(Concat(Txn.accounts[1], Itob(Txn.assets[0])), Itob(Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount()))
           ),
        Int(1)
    )

    acceptNFT = Seq(
        contents := App.box_get(Concat(Txn.sender(), Itob(Txn.assets[0]))),
        Assert(contents.hasValue()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Btoi(contents.value())
        }),
        InnerTxnBuilder.Submit(),
        Assert(App.box_delete(Concat(Txn.sender(), Itob(Txn.assets[0])))),
        Int(1)
    )

    # doesn't need anyone to opt in
    handle_optin = Return(Int(1))

    # only the creator can closeout the contract
    handle_closeout = Return(Int(1))

    # nobody can update the contract
    handle_updateapp =  Return(Txn.sender() == Global.creator_address())

    # only creator can delete the contract
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())

    opt_in = Seq(
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].receiver() == Global.current_application_address()),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].amount() == Int(100000)),
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
        [Txn.application_args[0] == Bytes("addboxNFT"), Return(addboxNFT)],
        [Txn.application_args[0] == Bytes("acceptNFT"), Return(acceptNFT)]      
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