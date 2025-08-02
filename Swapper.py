from pyteal import *


def approval_program():
    
    handle_creation = Return(
        Int(1)
    )

    register = Seq(
        Assert(Txn.sender() == Addr("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ")),
        App.box_put(Concat(Itob(Txn.assets[1]), Txn.application_args[1]), Itob(Txn.assets[0])),
        Int(1)
    )
    
    equip = Seq(
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].xfer_asset() == Txn.assets[0]),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].asset_receiver() == Global.current_application_address()),
        Assert(Gtxn[Minus(Txn.group_index(), Int(1))].asset_amount() == Int(1)),
        holding := AssetHolding.balance(Txn.sender(), Txn.assets[1]),
        Assert(holding.value() >= Int(1)),
        trait := App.box_get(Concat(Itob(Txn.assets[1]), Txn.application_args[1])),
        Assert(Btoi(trait.value()) == Int(0)),
        Assert(App.box_delete(Concat(Itob(Txn.assets[1]), Txn.application_args[1]))),
        App.box_put(Concat(Itob(Txn.assets[1]), Txn.application_args[1]), Itob(Txn.assets[0])),
        Int(1)
    )

    unequip = Seq(
        holding := AssetHolding.balance(Txn.accounts[1], Txn.assets[1]),
        Assert(holding.value() == Int(1)),
        trait := App.box_get(Concat(Itob(Txn.assets[1]), Txn.application_args[1])),
        Assert(Btoi(trait.value()) == Txn.assets[0]),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.accounts[1],
            TxnField.asset_amount: Int(1),
        }),
        InnerTxnBuilder.Submit(),
        Assert(App.box_delete(Concat(Itob(Txn.assets[1]), Txn.application_args[1]))),
        App.box_put(Concat(Itob(Txn.assets[1]), Txn.application_args[1]), Itob(Int(0))),
        Int(1)
    )

    optin = Seq(
        Assert(Txn.sender() == Addr("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ")),
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

    # doesn't need anyone to opt in
    handle_optin = Return(Int(1))

    # only the creator can closeout the contract
    handle_closeout = Return(Int(1))

    # nobody can update the contract
    handle_updateapp =  Return(Txn.sender() == Global.creator_address())

    # only creator can delete the contract
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())


    # handle the types of application calls
    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.application_args[0] == Bytes("equip"), Return(equip)],
        [Txn.application_args[0] == Bytes("unequip"), Return(unequip)],
        [Txn.application_args[0] == Bytes("optin"), Return(optin)],
        [Txn.application_args[0] == Bytes("register"), Return(register)],

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