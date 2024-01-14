from pyteal import *

def approval_program():
    
    
    handle_creation = Return(Int(1))

    score = Seq(
        Assert(Txn.sender() == Addr("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE")),
        boxOld := App.box_get(Txn.accounts[1]),
        If(boxOld.hasValue(),
           If(Btoi(Txn.application_args[1]) > Btoi(boxOld.value()),
                App.box_put(Txn.accounts[1], Txn.application_args[1])
            ),
            App.box_put(Txn.accounts[1], Txn.application_args[1])
        ),
        Int(1)
    )

    amount = ScratchVar(TealType.uint64)

    reward = Seq(
        Assert(Txn.sender() == Addr("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE")),
        decimals := AssetParam.decimals(Txn.assets[0]),
        balance := AssetHolding.balance(Global.current_application_address(), Txn.assets[0]),
        If(Mul(Btoi(Txn.application_args[1]), Exp(Int(10), decimals.value())) >= balance.value(),
            amount.store(balance.value()),
            amount.store(Mul(Btoi(Txn.application_args[1]), Exp(Int(10), decimals.value())))
        ),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.accounts[1],
            TxnField.asset_amount: Mul(Btoi(Txn.application_args[1]), Exp(Int(10), decimals.value())),
        }),
        InnerTxnBuilder.Submit(),
        Int(1)
    )

    i = ScratchVar(TealType.uint64)
  
    opt_in = Seq(
         For(i.store(Int(0)), i.load() < Txn.assets.length(), i.store(i.load() + Int(1))).Do(Seq(
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[i.load()],
                TxnField.asset_receiver: Global.current_application_address(),
                TxnField.asset_amount: Int(0),
            }),
            InnerTxnBuilder.Submit()
         )),
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
        [Txn.application_args[0] == Bytes("optin"), Return(opt_in)],
        [Txn.application_args[0] == Bytes("score"), Return(score)],
        [Txn.application_args[0] == Bytes("reward"), Return(reward)],








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